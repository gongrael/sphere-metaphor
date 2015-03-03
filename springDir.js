app.directive('spring', function($parse, $log) {
  return {
    restrict: "EA",
    template: '<div id="webgl-container" class="centred"></div>',

    // MUST use this scope, which is an isolated child scope, but still possess two-way binding? Still unclear how this works exactly. Will
    //continue to learn about it. But for now, this will allow you to 
    scope: {
      ballDataSpring: '='
    },

    link: function(scope, elem, attrs) {

      //parses all the data found in the attribute ball-data-spring, in this case it will grab the data represeted by
      //ballX in the controller
      //Parse creates a function of sorts, which can be fed a specific scope? Not 100% sure, need to read more.
      var exp = $parse(attrs.ballDataSpring);

      //saving the data to a variable, it returns the data, probably done so that you don't have to feed 
      //scope back into the data. not super important
      // To get to the parent scope (ie. whats in the controller), you have to feed in scope.$parent, otherwise it tries to use the children scope, which doesn't have
      // any properties.
      var ballData = exp(scope.$parent);

      //need to define the variable container so that we can match it with the draggable example. 
      var container = document.getElementById("webgl-container");

      // Variables to make the mouse tracking work.
      var objects = [],
        plane;
      var raycaster = new THREE.Raycaster();
      var mouse = new THREE.Vector2(),
        //might not need the offset in 3 dimensions. only moving it in 2...
        offset = new THREE.Vector3(),
        INTERSECTED, SELECTED;
      var currentMouse;

      //Add the property isDown to mouse, in order to pause the animation
      mouse.isDown = false;

      var spring;

      var fullSpring = 0;
      var compressSpring = 1;


      //define variables for the scene. Define previous so that you can remove the object. Define material so you can load
      // it onto the sphere. 
      var scene = new THREE.Scene(),
        light = new THREE.PointLight(0xffffff),
        camera,
        renderer = new THREE.WebGLRenderer({
          alpha: true //need alpha to be true to change colour of background
        }),
        sphere,
        stats,
        previous,
        material;

      // no need for window.onload because this directive is loaded after assets are loaded.
      // using window.onload calls two instances of THREE, which cause the camera to break.
      initScene();


      // call the animate function. This was copied from the fuckingdevelopers demo on angular and Three.JS
      animate();

      // this function sets up the original container and the light sources ect. 


      function initScene() {

        var width = 400;
        var height = 100;

        // setup renderer
        renderer.setSize(width, height);
        // To get the white background
        renderer.setClearColor(0xffffff, 1);

        container.appendChild(renderer.domElement);

        var lights = [];
        lights[0] = new THREE.PointLight(0xdddddd, 1, 0);
        //lights[1] = new THREE.PointLight(0xffffff, 1, 0);
       // lights[2] = new THREE.PointLight(0x9c00ff, 1, 300);
        lights[3] = new THREE.AmbientLight(0xc1c1c1);

        lights[0].position.set(0, 200, 0);
        //lights[1].position.set(100, 200, 100);
        // lights[2].position.set(100, -200, -100);

        scene.add(lights[0]);
        //scene.add(lights[1]);
        //scene.add(lights[2]);
        scene.add(lights[3]);


        camera = new THREE.PerspectiveCamera(
          45,
          width / height,
          1,
          1000
        );
        camera.position.z = 100;
        scene.add(camera);

       
        ///add a plane to the scene to make sure mouse controls work. Will need to look into how this works exactly. 
        plane = new THREE.Mesh(
          new THREE.PlaneBufferGeometry(500, 500),
          new THREE.MeshBasicMaterial({
            color: 0x000000,
            opacity: 0.25,
            transparent: true
          })
        );
        plane.visible = false;
        scene.add(plane);

        //Loading the model. In this case we loaded a spring
        // the spring was animated used shape keys, and a very simple material was added.

        var jsonLoader = new THREE.JSONLoader();
        jsonLoader.load("springAni.js", addModelToScene);
        // addModelToScene function is called back after model has loaded


        //These are listening for clicks of the mouse on the screen.
        renderer.domElement.addEventListener('mousemove', onDocumentMouseMove, false);
        renderer.domElement.addEventListener('mousedown', onDocumentMouseDown, false);
        renderer.domElement.addEventListener('mouseup', onDocumentMouseUp, false);

        //might wanna add the eventListener soon.
        //window.addEventListener( 'resize', onWindowResize, false );
      }

      // this is for uploading the correct materials for the imported 3D asset
      // in this case, we loaded a JSON object from blender, the spring. 
      function addModelToScene(geometry, materials) {

        // for preparing animation, need to tell the materials to have the potential to morph between keyframes
        for (var i = 0; i < materials.length; i++)
          materials[i].morphTargets = true;

        // materials are definied in the JSON file for the 3D model. 
        var material = new THREE.MeshFaceMaterial(materials);
        spring = new THREE.Mesh(geometry, material);
        spring.scale.set(11, 11, 11);
        spring.rotation.z = (convert(-90))
        spring.position.x = -70;
        scene.add(spring);

        //push in the spring to objects so you can detect when its selected
        objects.push(spring);
      }

      //quick function for converting degrees into radians.
      function convert(degree) {
        return degree * (Math.PI / 180);
      };



      //The below functions are for the movement of the balls. Have to adjust the mouse x and y to 
      //correspond to the current position of the mouse. 
      function onDocumentMouseMove(event) {
        event.preventDefault();

        // have to use the render.domElement.offset, in order to have the 3D assets anywhere on the page. 

        mouse.x = ((event.clientX - renderer.domElement.offsetLeft) / renderer.domElement.width) * 2 - 1;
        mouse.y = -((event.clientY - renderer.domElement.offsetTop) / renderer.domElement.height) * 2 + 1;

        // raycaster is the way of determining the selection. It is based on the mouse position and the camera angle within
        // the scene.

        raycaster.setFromCamera(mouse, camera);

        //if an object is selected, do what is inside this if statement
        if (SELECTED) {
          //why are we using the position on the plane to determine movement? This is for the offset, helps to normalize?
          // as you start moving the object, its coordinates change, causes issues?
          var intersects = raycaster.intersectObject(plane);
          // CHANGES THE MORPH OF THE SPRING BASED ON THE POSITION OF THE BALL
          // NOTE, for some reason, intersects[0].point.x has a starting value, and the 
          // if statement is run (even though SELECTED should be null). It seems that raycaster
          // initializes with an actual value. Don't know why.
          var currentMouse = (intersects[0].point.x + 30) / 100;

          //$log.log(intersects[0].point.x);

          if (intersects[0].point.x > 11 && intersects[0].point.x < 92) {

            //SELECTED.position.x = intersects[0].point.x - 20;
                        
            spring.morphTargetInfluences[0] = currentMouse;
            spring.morphTargetInfluences[1] = 1 - currentMouse;
            
            block.x = intersects[0].point.x + 40;
            // This works at updating the scope parent. Have to use scope.$apply in order to update to the parent scope.
            // You must use the $apply, because it is within a function, and in order for angular to execute it you have to
            // explicitly add it to its cycle.  
            scope.$apply(function() {
              exp.assign(scope.$parent, intersects[0].point.x);
            });
           }

          //return;
        }

        var intersects = raycaster.intersectObjects(objects);

        if (intersects.length > 0) {
          if (INTERSECTED != intersects[0].object) {
            INTERSECTED = intersects[0].object;
            plane.position.copy(INTERSECTED.position);
            plane.lookAt(camera.position);
          }
          container.style.cursor = 'pointer';
        } else {
          INTERSECTED = null;
          container.style.cursor = 'auto';
        }
      }

      function onDocumentMouseDown(event) {
        event.preventDefault();
        var vector = new THREE.Vector3(mouse.x, mouse.y, 0.5).unproject(camera);
        var raycaster = new THREE.Raycaster(camera.position, vector.sub(camera.position).normalize());
        var intersects = raycaster.intersectObjects(objects);
        
        mouse.isDown = true;

        if (intersects.length > 0) {
          $log.log("working");
          SELECTED = intersects[0].object;
          var intersects = raycaster.intersectObject(plane);
          offset.copy(intersects[0].point).sub(plane.position);
          container.style.cursor = 'move';
        }
      }

      function onDocumentMouseUp(event) {
        event.preventDefault();
        
        mouse.isDown = false;
        
        if (INTERSECTED) {
          plane.position.copy(INTERSECTED.position);
        }
        SELECTED = null;
        container.style.cursor = 'auto';
      }

      function animate() {
        requestAnimationFrame(animate);
        render();
      }


      //from the spring physics, likely redundant with the animation. 
      // http://burakkanber.com/blog/physics-in-javascript-car-suspension-part-1-spring-mass-damper/

      var frameRate = 1 / 120;
      var frameDelay = frameRate * 1000;

      //The below variables are from the physics tutorial 
      // http://burakkanber.com/blog/physics-in-javascript-car-suspension-part-1-spring-mass-damper/
      /* Spring stiffness, in kg / s^2 */
      var k = -20;
      var springLength = 90;

      /* Damping constant, in kg / s */
      var b = -0.0;

      /* Block position and velocity. */
      var block = {
        x: 100,
        v: 0,
        mass: 0.5
      };



      function render() {
      if (spring && !mouse.isDown) // exists / is loaded 
      {
        // former way of determining the amount of the morph, need to switch to physics interpretation.
        // time = new Date().getTime() % duration;

        //Physics part of this code is taken from the physics tutorial http://burakkanber.com/blog/physics-in-javascript-car-suspension-part-1-spring-mass-damper/
        // eliminated mention of the wall, as it was not necessary for this. 

        // defines the force experienced by the spring. need spring length to equal equilibrium position.
        var F_spring = k * (block.x - springLength);

        // defines the dampening force, it is always opposed to motion.
        var F_damper = b * block.v;

        //acceleraiton is the net force, divided by the mass of the spring/ball system
        var a = (F_spring + F_damper) / block.mass;

        //this is the change in velocity at a certain time measure
        block.v += a * frameRate;

        //this  is the change in position with respect to that time measure.
        block.x += block.v * frameRate;

        //convert this position into a specific morph
        var changeIn = springLength - block.x;

        //changeFraction is a fractional number.
        var changeFraction = changeIn / springLength;

        spring.morphTargetInfluences[0] =
          0.65 - changeFraction;
        spring.morphTargetInfluences[1] =
          1 - spring.morphTargetInfluences[0];
          
          scope.$apply(function() {
              exp.assign(scope.$parent, block.x - 40);
            });
      }
        renderer.render(scene, camera);
      }

      return {
        scene: scene,
      }
    }
  }
});