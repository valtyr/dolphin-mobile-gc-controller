(function() {
  var AR_WIDTH = 16;
  var AR_HEIGHT = 9;

  var MAINPAD_CENTER_X = 12;
  var MAINPAD_CENTER_Y = 30;
  var MAINPAD_RADIUS = 4;
  var MAINPAD_WIDTH = 11.6;
  var MAINPAD_HEIGHT = 20.4;

  var CPAD_CENTER_X = 61;
  var CPAD_CENTER_Y = 75;
  var CPAD_RADIUS = 2;
  var CPAD_WIDTH = 10.7;
  var CPAD_HEIGHT = 18.2;

  var ws;
  var controller_no = Math.min(
    parseInt(window.location.hash.substr(1)) || 1,
    4
  );

  //Element definitions
  var controller = document.getElementById("controller");
  var buttons = document.querySelectorAll("#buttons > div");
  var mainpad = document.getElementById("mainpad");
  var cpad = document.getElementById("cpad");

  window.onhashchange = function() {
    window.location.reload();
  };

  function init_ws() {
    ws = new WebSocket("ws://" + window.location.host);
  }

  init_ws();

  function send(data) {
    if (ws.readyState === ws.CLOSED) {
      init_ws();
      return;
    } else if (ws.readyState !== ws.OPEN) {
      // Ignore all commands until socket opens
      return;
    } else {
      ws.send(data);
    }
  }

  function send_json(data) {
    send(JSON.stringify(data));
  }

  function perform(action, ctrlno, button, value) {
    send_json({
      controller: ctrlno,
      action: action,
      button: button,
      value: value
    });
  }

  function maintain_aspect_ratio() {
    var width = window.innerWidth;
    var height = window.innerHeight;
    var gc_width = width;
    var gc_height = AR_HEIGHT / AR_WIDTH * width;
    if (width / height > AR_WIDTH / AR_HEIGHT) {
      width = height * AR_WIDTH / AR_HEIGHT;
    } else if (width / height < AR_WIDTH / AR_HEIGHT) {
      height = width * AR_HEIGHT / AR_WIDTH;
    }
    controller.style.width = width + "px";
    controller.style.height = height + "px";
  }
  window.addEventListener("resize", maintain_aspect_ratio);
  maintain_aspect_ratio();

  function init_pad(pad_name, element, cx, cy, rad, width, height) {
    element.style.width = width + "%";
    element.style.height = height + "%";
    element.addEventListener("touchmove", function(e) {
      e.preventDefault();
      e.stopPropagation();
      var bottom_left = [cx - rad, cy - rad * 16 / 9];
      var top_right = [cx + rad, cy + rad * 16 / 9];
      var touchobj = e.changedTouches[0];
      var x_percentage = touchobj.clientX / window.innerWidth * 100 - width / 2;
      var y_percentage =
        touchobj.clientY / window.innerHeight * 100 - height / 2;
      x_percentage = Math.min(
        Math.max(x_percentage, bottom_left[0]),
        top_right[0]
      );
      y_percentage = Math.min(
        Math.max(y_percentage, bottom_left[1]),
        top_right[1]
      );

      var pad_value = [
        (x_percentage - bottom_left[0]) / (top_right[0] - bottom_left[0]),
        Math.abs(
          (y_percentage - bottom_left[1]) / (top_right[1] - bottom_left[1]) - 1
        )
      ];
      perform(
        "set",
        controller_no,
        pad_name,
        pad_value[0] + " " + pad_value[1]
      );
      element.style.top = y_percentage + "%";
      element.style.left = x_percentage + "%";
    });
    element.addEventListener("touchend", function(e) {
      e.preventDefault();
      element.style.left = cx + "%";
      element.style.top = cy + "%";
      perform("set", controller_no, pad_name, 0.5 + " " + 0.5);
    });
    element.dispatchEvent(new Event("touchend"));
  }

  function elements_intersecting_touch(selector, cx, cy, rad) {
    var elements = Array.from(document.querySelectorAll(selector));
    return elements.filter(function(element) {
      var x = element.offsetLeft;
      var y = element.offsetTop;
      var w = element.offsetWidth;
      var h = element.offsetHeight;

      var distX = Math.abs(cx - x - w / 2);
      var distY = Math.abs(cy - y - h / 2);

      if (distX > w / 2 + rad) return false;
      if (distY > h / 2 + rad) return false;
      if (distX <= w / 2) return true;
      if (distY <= h / 2) return true;

      var dx = distX - w / 2;
      var dy = distY - h / 2;
      return (dx * dx + dy * dy <= rad) ^ 2;
    });
  }

  function touch_handler(event) {
    event.preventDefault();
    var touches = Array.from(event.touches);
    var buttons = Array.from(document.querySelectorAll("#buttons div"));
    function pressedButtons() {
      return buttons
        .filter(function(button) {
          return button.classList.contains("pressed");
        })
        .map(function(button) {
          return button.id;
        });
    }
    var pressed_before_touch = pressedButtons();
    pressed_before_touch.forEach(function(button) {
      var el = document.getElementById(button);
      el.classList.remove("pressed");
    });
    touches.forEach(function(touch) {
      var x = touch.clientX;
      var y = touch.clientY;
      var rad = touch.radiusX;
      var touched_buttons = elements_intersecting_touch(
        "#buttons div",
        x - controller.offsetLeft,
        y - controller.offsetTop,
        rad
      );
      touched_buttons.forEach(function(button) {
        button.classList.add("pressed");
      });
    });
    var currently_pressed = pressedButtons();
    pressed_before_touch.forEach(function(button) {
      if (currently_pressed.indexOf(button) == -1) {
        perform("release", controller_no, button);
      }
    });
    currently_pressed.forEach(function(button) {
      if (pressed_before_touch.indexOf(button) == -1) {
        perform("press", controller_no, button);
      }
    });
  }

  controller.addEventListener("touchstart", touch_handler, false);
  controller.addEventListener("touchend", touch_handler, false);
  controller.addEventListener("touchmove", touch_handler, false);
  init_pad(
    "main",
    mainpad,
    MAINPAD_CENTER_X,
    MAINPAD_CENTER_Y,
    MAINPAD_RADIUS,
    MAINPAD_WIDTH,
    MAINPAD_HEIGHT
  );
  init_pad(
    "c",
    cpad,
    CPAD_CENTER_X,
    CPAD_CENTER_Y,
    CPAD_RADIUS,
    CPAD_WIDTH,
    CPAD_HEIGHT
  );
})();
