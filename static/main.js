import coordinates from './coordinates.json' assert { type: 'json' };

// Scroll prevention
const b = document.body;
b.style.setProperty('--st', -(document.documentElement.scrollTop) + "px");
b.classList.add('noscroll');

// Initialize Canvas
const mainCanvas = document.getElementById("canvas")
const ctx = canvas.getContext("2d");
mainCanvas.width = window.innerWidth
mainCanvas.height = window.innerHeight

const overlayCanvas = document.getElementById("overlay-canvas")
const overlay_ctx = overlayCanvas.getContext("2d", { willReadFrequently: true })
overlayCanvas.width = window.innerWidth
overlayCanvas.height = window.innerHeight
// overlayCanvas.style.backgroundColor = "green"
// overlayCanvas.style.opacity = "50%"
overlayCanvas.style.zIndex = 2

// Initialize scale and offset logic
const zoomSpeed = 0.1
const startingScale = 1
let contextScale = startingScale

// Draw background image
const backgroundImageDimensions = [6600,3178]
const backgroundImage = new Image(...backgroundImageDimensions);
backgroundImage.onload = () => {
    ctx.drawImage(backgroundImage, 0, 0, backgroundImage.width * contextScale, backgroundImage.height * contextScale)
}
backgroundImage.src = "static/bg_map2.png";

const zoomMin = Math.min(mainCanvas.width / backgroundImage.width, mainCanvas.height / backgroundImage.height)
const zoomRange = [zoomMin, 2]

let building_images = {}

// Draw buildings
for(let building_info of coordinates){
    let img_element = document.createElement("img")
    img_element.id = building_info.name
    img_element.classList.add("building")
    img_element.src = "static/building_pngs/" + building_info.name + ".png"
    img_element.setAttribute("draggable", false)
    document.body.appendChild(img_element)

    img_element.onload = () => {
        building_images[building_info.name] = [img_element, img_element.width, img_element.height]
        img_element.style.left = building_info.left * contextScale + "px"
        img_element.style.top = building_info.top * contextScale + "px"
        img_element.style.width = img_element.width * contextScale + "px"
        img_element.style.height = img_element.height * contextScale + "px"
    }
}

let currentlyClicked = false
let currentTranslation = [0, 0]
let panStartPosition = [0, 0]

function drawMap(position){
    ctx.clearRect(0, 0, mainCanvas.width, mainCanvas.height)
    ctx.drawImage(backgroundImage, 
        position[0], 
        position[1], 
        backgroundImage.width * contextScale, backgroundImage.height * contextScale
    )
}

function drawBuildings(position){
    overlay_ctx.clearRect(0, 0, mainCanvas.width, mainCanvas.height)
    for(let building of coordinates){
        let img_data = building_images[building.name]
        let img = img_data[0]
        img.style.left = position[0] + building.left * contextScale + "px"
        img.style.top = position[1] + building.top * contextScale + "px"
        img.style.width = img_data[1] * contextScale + "px"
        img.style.height = img_data[2] * contextScale + "px"

        overlay_ctx.drawImage(img, 
            position[0] + building.left * contextScale, 
            position[1] + building.top * contextScale, 
            img_data[1] * contextScale, 
            img_data[2] * contextScale)
    }
}

// Panning
function onMouseDown(e){
    currentlyClicked = true
    panStartPosition = [e.clientX, e.clientY]
}

function onMouseUp(e){
    currentlyClicked = false
    currentTranslation = [currentTranslation[0] + e.clientX - panStartPosition[0], currentTranslation[1] + e.clientY - panStartPosition[1]]
}

function onMouseMove(e){
    if(currentlyClicked){
        let translateOffset = [currentTranslation[0] + e.clientX - panStartPosition[0], currentTranslation[1] + e.clientY - panStartPosition[1]]
        drawMap(translateOffset)
        drawBuildings(translateOffset)
    }
}

// Zooming
function onScroll(e){
    let direction = -Math.sign(e.deltaY)

    let worldCoordinates = screenToWorld([e.clientX, e.clientY])

    contextScale = Math.min(Math.max(contextScale * (1 + (zoomSpeed * direction)), zoomRange[0]), zoomRange[1])
    let adjustedScreenCoordinates = worldToScreen(worldCoordinates)

    currentTranslation[0] -= adjustedScreenCoordinates[0] - e.clientX
    currentTranslation[1] -= adjustedScreenCoordinates[1] - e.clientY

    drawMap(currentTranslation)
    drawBuildings(currentTranslation)
}

function screenToWorld(coordinates){
    return [
        (coordinates[0] - currentTranslation[0]) / (contextScale * backgroundImage.width), 
        (coordinates[1] - currentTranslation[1]) / (contextScale * backgroundImage.height)
    ]
}

function worldToScreen(coordinates){
    return [
        coordinates[0] * contextScale * backgroundImage.width + currentTranslation[0], 
        coordinates[1] * contextScale * backgroundImage.height + currentTranslation[1]
    ]
}

function onClick(e){
    if(overlay_ctx.getImageData(e.clientX, e.clientY,1,1).data[3] != 0){
        console.log("hit") 
    }
}

document.addEventListener("mousedown", onMouseDown)
document.addEventListener("mouseup", onMouseUp)
document.addEventListener("mousemove", onMouseMove)
document.addEventListener("wheel", onScroll)
document.addEventListener("click", onClick)