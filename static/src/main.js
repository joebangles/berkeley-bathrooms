import coordinates from './../data/coordinates.json' assert { type: 'json' };
import buildingFloorList from './../data/bathrooms.json' assert {type: 'json'}

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

// Initialize scale and offset logic
const zoomSpeed = 0.1
const startingScale = 1
const focusScale = 0.7
let contextScale = startingScale
let targettedBuilding = null
let minimumDrag = 5;

let currentlyClicked = false
let currentTranslation = [0, 0]
let panStartPosition = [0, 0]

// Draw background image
const backgroundImageDimensions = [6600,3178]
const backgroundImage = new Image(...backgroundImageDimensions);
backgroundImage.onload = () => {
    ctx.drawImage(backgroundImage, 0, 0, backgroundImage.width * contextScale, backgroundImage.height * contextScale)
}
backgroundImage.src = "static/img/map/bg_map2.png";

const zoomMin = Math.max(mainCanvas.width / backgroundImage.width, mainCanvas.height / backgroundImage.height)
const zoomRange = [zoomMin, 2]

let building_images = {}

// Sidebar
let openedFloor = null
let builtSidebars = {}

// Draw buildings
for(let building_info of coordinates){
    builtSidebars[building_info.name] = null

    let img_element = document.createElement("img")
    img_element.id = building_info.name
    img_element.classList.add("building")
    img_element.src = "static/img/building/" + building_info.name + ".png"
    img_element.setAttribute("draggable", false)
    // document.body.appendChild(img_element)

    img_element.onload = () => {
        building_images[building_info.name] = {
            "element": img_element,
            "width": img_element.width, 
            "height": img_element.height, 
            "top": building_info.top, 
            "left": building_info.left
        }
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
    for(let name of Object.keys(building_images)){
        let img_data = building_images[name]
        // console.log(img_data)
        let img = img_data.element
        if(name == targettedBuilding){
            overlay_ctx.globalAlpha = 1
        }
        else {
            overlay_ctx.globalAlpha = 0.5
        }
        // if(building.name == targettedBuilding){
        //     img_data[3] = Math.min(Math.max(img_data[3] + 0.05, 0.5), 1)
        //     overlay_ctx.globalAlpha = img_data[3]
        // }
        // else {
        //     img_data[3] = Math.min(Math.max(img_data[3] - 0.05, 0.5), 1)
        //     overlay_ctx.globalAlpha = img_data[3]
        // }

        // building_images[building.name] = img_data
        // img.style.left = position[0] + building.left * contextScale + "px"
        // img.style.top = position[1] + building.top * contextScale + "px"
        // img.style.width = img_data[1] * contextScale + "px"
        // img.style.height = img_data[2] * contextScale + "px"
        overlay_ctx.drawImage(img, 
            position[0] + img_data.left * contextScale, 
            position[1] + img_data.top * contextScale, 
            img_data.width * contextScale, 
            img_data.height * contextScale)
    }
}

// Mouse Events
function onMouseDown(e){
    panStartPosition = [e.clientX, e.clientY]
    if(e.target.id == "overlay-canvas"){
        currentlyClicked = true
    }
}

function onMouseUp(e){
    if(currentlyClicked){
        currentlyClicked = false
        currentTranslation = [
            Math.min(Math.max(currentTranslation[0] + e.clientX - panStartPosition[0], mainCanvas.width- backgroundImage.width * contextScale), 0),
            Math.min(Math.max(currentTranslation[1] + e.clientY - panStartPosition[1], mainCanvas.height-backgroundImage.height * contextScale), 0)
        ]
    }
    let delta = [Math.abs(e.clientX - panStartPosition[0]), Math.abs(e.clientY - panStartPosition[1])]
    if(delta[0] < minimumDrag && delta[1] < minimumDrag){
        onClick(e)
    }
    // if(e.target.closest(".floor-button")){
    //     onClick(e)
    // }
}

function onMouseMove(e){
    if(currentlyClicked){
        let newX = Math.min(Math.max(currentTranslation[0] + e.clientX - panStartPosition[0], mainCanvas.width-backgroundImage.width * contextScale), 0)
        let newY = Math.min(Math.max(currentTranslation[1] + e.clientY - panStartPosition[1], mainCanvas.height-backgroundImage.height * contextScale), 0)
        let transformOffset = [newX, newY]
        drawMap(transformOffset)
        drawBuildings(transformOffset)
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

    contextScale = Math.min(Math.max(contextScale * (1 + (zoomSpeed * direction)), zoomRange[0]), zoomRange[1])
    let adjustedScreenCoordinates = worldToScreen(worldCoordinates)

    currentTranslation[0] = Math.min(Math.max(currentTranslation[0] - (adjustedScreenCoordinates[0] - e.clientX), mainCanvas.height - backgroundImage.height * contextScale), 0)
    currentTranslation[1] = Math.min(Math.max(currentTranslation[1] - (adjustedScreenCoordinates[1] - e.clientY), mainCanvas.height - backgroundImage.height * contextScale), 0)

    drawMap(currentTranslation)
    drawBuildings(currentTranslation)
}

function getSidebar(buildingName){
    if(builtSidebars[buildingName]){
        return builtSidebars[buildingName]
    }
    
    let sidebar = document.createElement("div")
    sidebar.classList.add("sidebar")

    let nameplate = document.createElement("div")
    nameplate.classList.add("sidebar-item", "nameplate")
    nameplate.innerHTML = buildingName

    sidebar.appendChild(nameplate)

    for(let floorName in buildingFloorList[buildingName].keys){
        let item = document.createElement("div")
        item.classList.add("sidebar-item")
        sidebar.appendChild(item)

        let button = document.createElement("button")
        button.classList.add("floor-button")
        item.appendChild(button)

        let floorTitle = document.createElement("span")
        floorTitle.classList.add("centered-text")
        floorTitle.innerHTML = floorName
        button.appendChild(floorTitle)

        let plusSign = document.createElement("div")
    }
}

function onClickBuilding(buildingName){
    // Focus in
    contextScale = focusScale
    let building_info = building_images[buildingName]

    let unclampedX = 450 /  2  - building_info.left * contextScale + mainCanvas.width / 2 -  building_info.width / 2
    let unclampedY = -building_info.top * contextScale + mainCanvas.height / 2 - building_info.height / 2

    let newX = Math.min(Math.max(unclampedX, mainCanvas.width-backgroundImage.width * contextScale), 0)
    let newY = Math.min(Math.max(unclampedY, mainCanvas.height-backgroundImage.height * contextScale), 0)
    
    currentTranslation[0] = newX
    currentTranslation[1] = newY
    
    drawMap(currentTranslation)
    drawBuildings(currentTranslation)

    // Show sidebar
    if(openedFloor == null){
        sidebar.classList.remove("hide-sidebar")
    }


}

function onClick(e){
    let buildingName = findBuilding([e.clientX, e.clientY])
    if(buildingName !== null){
        onClickBuilding(buildingName)
    }
    if(e.target.closest(".floor-button")){
        let clickedFloor = e.target.closest(".sidebar-item")

        let newPlusItems = [clickedFloor.querySelector(".plusvert"), clickedFloor.querySelector(".plushozi")]
        let oldPlusItems = [openedFloor.querySelector(".plusvert"), openedFloor.querySelector(".plushozi")]

        console.log(clickedFloor)
        console.log(openedFloor)

        if(clickedFloor !== openedFloor){
            openedFloor = clickedFloor
            let to_expand = clickedFloor.querySelector(".bathroom-select")
            to_expand.classList.add("show-bathroom-select")

            plus_vert.classList.add("rotate-plus")
            plus_hozi.classList.add("shrink-plus")
            plus_hozi.classList.add("rotate-plus")
        }
        else {
            openedFloor = null
            let to_retract = clickedFloor.querySelector(".bathroom-select")
            to_retract.classList.remove("show-bathroom-select")

            plus_vert.classList.remove("rotate-plus")
            plus_hozi.classList.remove("shrink-plus")
            plus_hozi.classList.remove("rotate-plus")
        }
    }
}

// Coordinate conversions
function screenToWorld(c){
    return [
        (c[0] - currentTranslation[0]) / (contextScale * backgroundImage.width), 
        (c[1] - currentTranslation[1]) / (contextScale * backgroundImage.height)
    ]
}

function worldToScreen(c){
    return [
        c[0] * contextScale * backgroundImage.width + currentTranslation[0], 
        c[1] * contextScale * backgroundImage.height + currentTranslation[1]
    ]
}

function findBuilding(location){
    // console.log("yo")
    let which_building = null
    if(overlay_ctx.getImageData(...location,1,1).data[3] != 0){
        for (let name of Object.keys(building_images)){
            let building_info = building_images[name]

            let building_dimensions = [building_info.width * contextScale, building_info.height * contextScale]
            let building_location = worldToScreen([building_info.left / backgroundImage.width, building_info.top / backgroundImage.height])
            
            // If mouse is within bounding rect
            if(location[0] >= building_location[0] && 
            location[0] <= building_location[0] + building_dimensions[0] && 
            location[1] >= building_location[1]  && 
            location[1] <= building_location[1] + building_dimensions[1]){
                which_building = name
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