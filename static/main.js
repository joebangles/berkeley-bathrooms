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
overlayCanvas.style.zIndex = 2

// Initialize scale and offset logic
const zoomSpeed = 0.1
const startingScale = 1
let contextScale = startingScale
let targettedBuilding = null
let minimumDrag = 5;

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

let currentlyClicked = false
let currentTranslation = [0, 0]
let panStartPosition = [0, 0]

// Draw buildings
for(let building_info of coordinates){
    let img_element = document.createElement("img")
    img_element.id = building_info.name
    img_element.classList.add("building")
    img_element.src = "static/building_pngs/" + building_info.name + ".png"
    img_element.setAttribute("draggable", false)
    // document.body.appendChild(img_element)

    img_element.onload = () => {
        building_images[building_info.name] = [img_element, img_element.width, img_element.height]
        // img_element.style.left = building_info.left * contextScale + "px"
        // img_element.style.top = building_info.top * contextScale + "px"
        // img_element.style.width = img_element.width * contextScale + "px"
        // img_element.style.height = img_element.height * contextScale + "px"

        overlay_ctx.drawImage(img_element, 
            building_info.left * contextScale, 
            building_info.top * contextScale, 
            img_element.width * contextScale, 
            img_element.height * contextScale)
    }
}

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
        if(building.name == targettedBuilding){
            overlay_ctx.globalAlpha = 1;
        }
        else {
            overlay_ctx.globalAlpha = 0.5;
        }
        // img.style.left = position[0] + building.left * contextScale + "px"
        // img.style.top = position[1] + building.top * contextScale + "px"
        // img.style.width = img_data[1] * contextScale + "px"
        // img.style.height = img_data[2] * contextScale + "px"
        
        overlay_ctx.drawImage(img, 
            position[0] + building.left * contextScale, 
            position[1] + building.top * contextScale, 
            img_data[1] * contextScale, 
            img_data[2] * contextScale)
    }
}

// Mouse Events
function onMouseDown(e){
    currentlyClicked = true
    panStartPosition = [e.clientX, e.clientY]
}

function onMouseUp(e){
    currentlyClicked = false
    currentTranslation = [currentTranslation[0] + e.clientX - panStartPosition[0], currentTranslation[1] + e.clientY - panStartPosition[1]]
    let delta = [Math.abs(e.clientX - panStartPosition[0]), Math.abs(e.clientY - panStartPosition[1])]
    if(delta[0] < minimumDrag && delta[1] < minimumDrag){
        onClick(e)
    }
}

function onMouseMove(e){
    if(currentlyClicked){
        let translateOffset = [currentTranslation[0] + e.clientX - panStartPosition[0], currentTranslation[1] + e.clientY - panStartPosition[1]]
        drawMap(translateOffset)
        drawBuildings(translateOffset)
    }
    else{
        let foundBuilding = findBuilding([e.clientX, e.clientY])
        targettedBuilding = foundBuilding
        drawBuildings(currentTranslation)
    }
}

function onScroll(e){
    let direction = -Math.sign(e.deltaY)

    let worldCoordinates = screenToWorld([e.clientX, e.clientY])
    // console.log(worldCoordinates)

    contextScale = Math.min(Math.max(contextScale * (1 + (zoomSpeed * direction)), zoomRange[0]), zoomRange[1])
    let adjustedScreenCoordinates = worldToScreen(worldCoordinates)
    // console.log(adjustedScreenCoordinates)

    currentTranslation[0] -= adjustedScreenCoordinates[0] - e.clientX
    currentTranslation[1] -= adjustedScreenCoordinates[1] - e.clientY

    drawMap(currentTranslation)
    drawBuildings(currentTranslation)
}

function onClick(e){
    console.log(findBuilding([e.clientX, e.clientY])) 
}

// Coordinate conversions
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

function findBuilding(location){
    // console.log("yo")
    let which_building = null
    if(overlay_ctx.getImageData(...location,1,1).data[3] != 0){
        for (let building_info of coordinates){
            // TODO: This fucks things up cause this fn is getting called by mouse move and things might not be loaded
            let building_dimensions = [building_images[building_info.name][1] * contextScale, building_images[building_info.name][2] * contextScale]
            let building_location = worldToScreen([building_info.left / backgroundImage.width, building_info.top / backgroundImage.height])
            
            // If mouse is within bounding rect
            if(location[0] >= building_location[0] && 
            location[0] <= building_location[0] + building_dimensions[0] && 
            location[1] >= building_location[1]  && 
            location[1] <= building_location[1] + building_dimensions[1]){
                which_building = building_info.name
                break;
            }
        }
    }
    return which_building
}

document.addEventListener("mousedown", onMouseDown)
document.addEventListener("mouseup", onMouseUp)
document.addEventListener("mousemove", onMouseMove)
document.addEventListener("wheel", onScroll)