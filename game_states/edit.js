var jaws = (function(jaws) {

if(!jaws.game_states) jaws.game_states = {}

/**
 *
 * jaws game state to edit/move Sprite's around
 * This is NOT included in jaws.js, jaws-min.js or jaws-dynamic.js and must be loaded separately if needed.
 * See example10.html for a demo
 *
 * @property {string} title use this as key when saving game_object properties to localStorage, defaults to current url
 * @property snap_to_grid snap all game objects to predifned grid
 * @property {array} grid_size size of grid, mostly make sense with snap_to_grid set to true and TileMap() later on
 * @property {array} game_objects game_objects to paint and modify on screen
 *
 */
jaws.game_states.Edit = function(options) {
  if(! options ) options = {};
  var game_objects = options.game_objects || []
  var grid_size = options.grid_size || [32,32]
  var snap_to_grid = options.snap_to_grid || true
  var track_modified = options.track_modified || true
  var title = options.title || window.location.href

  var that = this
  var click_at
  var edit_tag
  var cursor_object 
  var objects_dragged
  
  function mousedown(e) {
    var x = (e.pageX || e.clientX) - jaws.canvas.offsetLeft
    var y = (e.pageY || e.clientX) - jaws.canvas.offsetTop
    jaws.log("click @ " + x + "/" + y)

    var code = ( e.keyCode ? e.keyCode : e.which );

    if(code === 3) {  // Right mouse button
      var clone_object = gameObjectsAt(x, y)[0]
      if(clone_object)  cursor_object = new clone_object.constructor( clone_object.attributes() );
      else              cursor_object = undefined;
    }
    else {
      var clicked_object = gameObjectsAt(x, y)[0]      
      if(clicked_object) {
        jaws.pressed("ctrl") ? toggle(clicked_object) : select(clicked_object)
        select(clicked_object)
        cursor_object = undefined
        click_at = [x,y]
        edit_tag.innerHTML = "Selected game objects:<br/>"
        game_objects.filter(isSelected).forEach( function(element, index) { edit_tag.innerHTML += element.toString() + "<br />"; });
        objects_dragged = false
      }
      else { 
        deselect(game_objects);
        paintWithCursor(); 
      }
    }
    e.preventDefault();
    return false;
  }
  function mousemove(e) {
    jaws.canvas.style.cursor = "default" // doesn't work?
    var x = (e.pageX || e.clientX) - jaws.canvas.offsetLeft
    var y = (e.pageY || e.clientX) - jaws.canvas.offsetTop

    if(cursor_object) {
      cursor_object.x = x
      cursor_object.y = y
    }

    if(click_at) {
      dx = x - click_at[0]
      dy = y - click_at[1]
      click_at = [x, y]
      objects_dragged = true

      game_objects.filter(isSelected).forEach( function(element, index) {
        element.move(dx, dy)
        if(track_modified) element.modified = true;
      });
    }
  }
  function mouseup(e) {
    var x = (e.pageX || e.clientX) - jaws.canvas.offsetLeft
    var y = (e.pageY || e.clientX) - jaws.canvas.offsetTop
    click_at = undefined
    
    if(grid_size && snap_to_grid) game_objects.filter(isSelected).forEach(snapToGrid);
    var clicked_object = gameObjectsAt(x, y)[0]

    if(!objects_dragged && !jaws.pressed("ctrl")) deselect(game_objects);
    if(!objects_dragged) toggle(clicked_object);
    if(jaws.pressed("shift")) { 
      game_objects.forEach( function(item) { 
        if(clicked_object.attributes().image === item.attributes().image) select(item);
      });
    }
    objects_dragged = false
  }

  function mousewheel(e) {
    var delta
    if(e.wheelDelta ) delta = e.wheelDelta/120;
    if(e.detail     ) delta = -e.detail/3;

    game_objects.filter(isSelected).forEach( function(element, index) { 
      element.z += delta*4 
      if(track_modified) element.modified = true;
    })
    //jaws.log("scroll by: " + delta)
  }

  function snapToGrid(object) {
    object.x -= object.x % grid_size[0]
    object.y -= object.y % grid_size[1]
  }
  function paintWithCursor() {
    if(!cursor_object) return;

    new_object = new cursor_object.constructor( cursor_object.attributes() )
    new_object.x -= new_object.x % grid_size[0]
    new_object.y -= new_object.y % grid_size[1]
    game_objects.push(new_object) 
  }

  function forceArray(obj)                { return obj.forEach ? obj : [obj] }
  function isSelected(element, index)     { return element.selected == true }
  function isNotSelected(element, index)  { return !isSelected(element) }
  function drawRect(element, index)       { element.rect().draw() }
  function select(obj) {
    forceArray(obj).forEach( function(element, index) { element.selected = true } )
  }
  function deselect(obj) {
    forceArray(obj).forEach( function(element, index) { element.selected = false } )
  }
  function toggle(obj) {
    forceArray(obj).forEach( function(element, index) { element.selected = element.selected ? false : true } )
  }

  function gameObjectsAt(x, y) {
    return game_objects.filter( function(obj) { return obj.rect().collidePoint(x, y) } )
  }
  function removeSelected() {
    game_objects.filter(isSelected).forEach( function(element, index) {
      game_objects.remove( element )
    });
  }

  /* Remove all event-listeners, hide edit_tag and switch back to previous game state */
  function exit() {
    edit_tag.style.display = "none"
    jaws.canvas.removeEventListener("mousedown", mousedown, false)
    jaws.canvas.removeEventListener("mouseup", mouseup, false)
    jaws.canvas.removeEventListener("mousemove", mousemove, false)
    jaws.canvas.removeEventListener("mousewheel", mousewheel, false)
    jaws.canvas.removeEventListener("DOMMouseSCroll", mousewheel, false)
    jaws.switchGameState(jaws.previous_game_state)
  }

  function save() {
    localStorage[title] = "[" + game_objects.map( function(game_object) { return game_object.toJSON() }) + "]";
    edit_tag.innerHTML = "Saved game objects to localStorage<br/>"
  }
  
  function add() {
    var constructor = prompt("Enter constructor to create new object from")
    constructor = eval(constructor)
    
    var data = prompt("Enter JSON initialize data, example: { \"image\" : \"block.bmp\" } ")
    data = JSON.parse(data)
    var object = new constructor(data)
    game_objects.push(object)
  }

  function log(string, append) {
    edit_tag.innerHTML += string;
  }

  this.setup = function() {
    edit_tag = document.getElementById("jaws-edit")
    edit_tag.style.display = "block"

    // Disable right click
    window.oncontextmenu = function(event) {
      event.preventDefault();
      event.stopPropagation();
      return false;
    };

    jaws.log("Editor activated!")
    jaws.preventDefaultKeys(["left", "right", "up", "down", "ctrl", "f1", "f2"])
    jaws.on_keydown(["f2","esc"], exit )
    jaws.on_keydown("s", save )
    jaws.on_keydown("delete",     removeSelected )
    jaws.on_keydown("add", add )

    jaws.canvas.addEventListener("mousedown", mousedown, false)
    jaws.canvas.addEventListener("mouseup", mouseup, false)
    jaws.canvas.addEventListener("mousemove", mousemove, false)
    jaws.canvas.addEventListener("mousewheel", mousewheel, false)
    jaws.canvas.addEventListener("DOMMouseSCroll", mousewheel, false)
  }

  this.update = function() {
    
  }
  
  this.draw = function() {
    jaws.clear()
    jaws.previous_game_state.draw()
    if(cursor_object) cursor_object.draw();
    game_objects.filter(isSelected).forEach(drawRect)
    if(grid_size) { draw_grid() }
  }

  function draw_grid() {
    jaws.context.save();
    jaws.context.strokeStyle = "rgba(0,0,255,0.3)";
    jaws.context.beginPath()

    for(var x=-0.5; x < jaws.width; x+=grid_size[0]) {
      jaws.context.moveTo(x, 0)
      jaws.context.lineTo(x, jaws.height)
    }
    for(var y=-0.5; y < jaws.height; y+=grid_size[1]) {
      jaws.context.moveTo(0, y)
      jaws.context.lineTo(jaws.width, y)
    }
    jaws.context.closePath()
    jaws.context.stroke()
    jaws.context.restore()
  }

}

return jaws;
})(jaws || {});
