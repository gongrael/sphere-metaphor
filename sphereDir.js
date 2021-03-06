app.directive('sphere', function($parse, $log, $timeout) {
  return {
    restrict: "EA",
    template: '<div id="webgl-container" class="centred"></div>',

    // MUST use this scope, which is an isolated child scope, but still possess two-way binding? Still unclear how this works exactly. Will
    //continue to learn about it. But for now, this will allow you to 
    scope: {
      sphereData: '='
    },

    link: function(scope, elem, attrs) {

      //parses all the data found in the attribute ball-data-spring, in this case it will grab the data represeted by
      //ballX in the controller
      //Parse creates a function of sorts, which can be fed a specific scope? Not 100% sure, need to read more.
      var exp = $parse(attrs.sphereData);

      //need to define the variable container so that we can match it with the draggable example. 
      var container = document.getElementById("webgl-container");
      //Add the property isDown to mouse, in order to pause the animation
      var mouseDown = false;
      var clicked = false;

      // Variables to make the mouse tracking work.
      var objects = [],
      plane;
      var raycaster = new THREE.Raycaster();
      var mouse = new THREE.Vector3(),

      INTERSECTED, SELECTED, selectedStartPos;
      var currentMouse;

      var width = 800;
      var height = 200;
      var startRadius = 300;

 
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

        var radiusSphere = 7;
    
        var arrowGroupRep, arrowGroupAtt, arrowGroupNet;

        //variables for electrostatic physics

        //var sphereInnerCharge = 1;
        //var sphere1InnerCharge = 1;
        //var sphereCharge = 1;
        //var sphere1Charge = 1;

        var spherePhys = {
          "v": 0
          };
          var sphere1Phys = {
          "v": 0
          };


        var sphereMass = 1;
        var sphere1Mass = 1;

        //var sphereRepK = 200;
        //var sphereAttK = 400;

         // Boundary Break Points
         // Important for relating animation to the world

        var firstBreak = 30;
        var secondBreak = 200;
        var thirdBreak = 350;
        var fourthBreak = 500;

        var equilibriumRadius = secondBreak;

         // Imporant force values

         // Value of force at first break, Repulsive greater. Will use linear graphs for this (for now) //can use this to allow students to manipulate variables?
        var ForceRepAtFirst = 52;
        var ForceAttAtFirst = 35;

         // Value of force at second break (equilibrium point), same for both. Attractive greater. Will use linear relationships. 
        var ForceRepAtSecond = 25;
        var ForceAttAtSecond = 25;

         // Value of the forces at the third break the attractive force is always greater, but both forces diminish to zero quickly. Will use inverse relationships (1/x)
        var ForceRepAtThird = 10;
        var ForceAttAtThird = 15;
        
        // always a small attractive force present.
        // Cant set the forceRep to 0, this will mess up the scaling, and through an error:
        //  matrix3.getInverse():cant invert matrix  - ie. because it was scaling to 0.
        var ForceRepAtFourth = 0.00000000001;
        var ForceAttAtFourth = 0.001;

         
         //Define the slope and the intercept for the different portions of the piece wise function. 
         //piecewise function contains only linear equations.
        Frep2Obj = linearEquation(firstBreak, ForceRepAtFirst, secondBreak, ForceRepAtSecond);
        Fatt2Obj = linearEquation(firstBreak, ForceAttAtFirst, secondBreak, ForceAttAtSecond);
           
          
        Frep3Obj = linearEquation(secondBreak, ForceRepAtSecond, thirdBreak, ForceRepAtThird);
        Fatt3Obj = linearEquation(secondBreak, ForceAttAtSecond, thirdBreak, ForceAttAtThird);
        
        Frep4Obj = linearEquation(thirdBreak, ForceRepAtThird, fourthBreak, ForceRepAtFourth);
        Fatt4Obj = linearEquation(thirdBreak, ForceAttAtThird, fourthBreak, ForceRepAtFourth);
        
    
    //define functions for the piece-wise function. this is a constructor of the linear equation variables

    function linearEquation(x1, y1, x2, y2) { //might switch arguments to object properties
      //Fill this with y = mx + b

      var forceObj = {};

      var yNet = y2 - y1;
      var xNet = x2 - x1;

      forceObj.m = yNet / xNet;

      forceObj.b = y1 - forceObj.m * x1;

      return forceObj;
    }

    //defines a inverse function for the piece-wise function.
    function inverseEquation(x1, y1) {

      var forceObj = {}
      
      forceObj.C = y1;
      forceObj.xo = x1-1;

      return forceObj;
    }

    initScene();

    // call the animate function. This was copied from the fuckingdevelopers demo on angular and Three.JS
    animate();

     // this function sets up the original container and the light sources etc. 

    function initScene() {

      // setup renderer
      renderer.setSize(width, height);
      // To get the white background
      renderer.setClearColor(0xffffff, 1);

      container.appendChild(renderer.domElement);

      var lights = [];
      lights[0] = new THREE.PointLight(0xdddddd, 1, 0);
      lights[1] = new THREE.PointLight(0x212121, 1, 0);
      lights[2] = new THREE.PointLight(0xededed, 1, 0);
      lights[3] = new THREE.AmbientLight(0x555555);

      lights[0].position.set(3, 400, 0);
      lights[1].position.set(-3, -400, 0);
      lights[2].position.set(1.5, 200, 0);

      scene.add(lights[0]);
      scene.add(lights[1]);
      scene.add(lights[2]);
      scene.add(lights[3]);

      ////////////     
      // Camera //
      ////////////

      //orthographic camera prevents distortions

      camera = new THREE.OrthographicCamera(
        width / -2,
        width / 2,
        height / 2,
        height / -2,
        1,
        2000
      );
      camera.position.z = 300;
      scene.add(camera);

      ///add a plane to the scene to make sure mouse controls work. Will need to look into how this works exactly. 
      plane = new THREE.Mesh(
        new THREE.PlaneBufferGeometry(5000, 5000),
        new THREE.MeshBasicMaterial({
          color: 0x000000,
          opacity: 0.25,
          transparent: true
        })
      );
      plane.visible = false;
      scene.add(plane);


      /////////////
      // Spheres //
      /////////////

      //First Sphere
      //Blue Sphere

      //materials need both a frontSide and a backside, in this way, you can 
      //consistently handle tranpsarencies.

      sphereGroup = new THREE.Object3D();

      var blueMaterialFront = new THREE.MeshPhongMaterial({
        color: 0x0000ff,
        ambient: 0x0000ff,
        transparent: true,
        opacity: 0.95,
        side: THREE.FrontSide
      });

      var blueMaterialBack = new THREE.MeshPhongMaterial({
        color: 0x0000ff,
        ambient: 0x0000ff,
        transparent: true,
        opacity: 0.95,
        side: THREE.BackSide
      });

      var sphereGeomBlue = new THREE.SphereGeometry(radiusSphere, 32, 16);

      sphereBlueFront = new THREE.Mesh(sphereGeomBlue, blueMaterialFront);
      sphereBlueBack = new THREE.Mesh(sphereGeomBlue, blueMaterialBack);

      //Red sphere

      var sphereGeomRed = new THREE.SphereGeometry(radiusSphere * 4, 32, 16);

      var redMaterialFront = new THREE.MeshPhongMaterial({
        color: 0xff0000,
        ambient: 0xff0000,
        transparent: true,
        opacity: 0.7,
        side: THREE.FrontSide
      });

      var redMaterialBack = new THREE.MeshPhongMaterial({
        color: 0xff0000,
        ambient: 0xff0000,
        transparent: true,
        opacity: 0.7,
        side: THREE.BackSide
      });


      var purpMaterialFront = new THREE.MeshPhongMaterial({
        color: 0xff00ff,
        ambient: 0xff00ff,
        transparent: true,
        opacity: 0.7,
        side: THREE.FrontSide
      });

      var purpMaterialBack = new THREE.MeshPhongMaterial({
        color: 0xff00ff,
        ambient: 0xff00ff,
        transparent: true,
        opacity: 0.7,
        side: THREE.BackSide
      });


      var sphereRedFront = new THREE.Mesh(sphereGeomRed, redMaterialFront);

      sphereRedBack = new THREE.Mesh(sphereGeomRed, redMaterialBack);


      //add all the children objects to the parent! 
      //ORDER IS IMPORTANT! Must add from back to front.

      sphereGroup.add(sphereBlueFront)
      sphereGroup.add(sphereBlueBack)
      sphereGroup.add(sphereRedFront)
      sphereGroup.add(sphereRedBack)

      // position the first sphere
      sphereGroup.position.x = -1*(startRadius/2);

      // sphereGroup.position.z = 0.1;
      // sphereGroup.position.y = 0.1;

      //need to add a parent value to all the components so it moves all as one.
      sphereBlueFront.userData.parent = sphereGroup;
      sphereBlueBack.userData.parent = sphereGroup;
      sphereRedFront.userData.parent = sphereGroup;
      sphereRedBack.userData.parent = sphereGroup;

      sphereGroup.name ="sphereGroup";

      scene.add(sphereGroup);

      objects.push(sphereGroup);


      //SECOND Sphere

      sphere1Group = new THREE.Object3D();

      sphereBlueFront1 = new THREE.Mesh(sphereGeomBlue, blueMaterialFront);
      sphereBlueBack1 = new THREE.Mesh(sphereGeomBlue, blueMaterialBack);
      sphereRedFront1 = new THREE.Mesh(sphereGeomRed, redMaterialFront);
      sphereRedBack1 = new THREE.Mesh(sphereGeomRed, redMaterialBack);

      //need to add a parent value to all the components so it moves all as one.
      sphereBlueFront1.userData.parent = sphere1Group;
      sphereBlueBack1.userData.parent = sphere1Group;
      sphereRedFront1.userData.parent = sphere1Group;
      sphereRedBack1.userData.parent = sphere1Group;

      sphere1Group.add(sphereBlueFront1)
      sphere1Group.add(sphereBlueBack1);
      sphere1Group.add(sphereRedFront1);
      sphere1Group.add(sphereRedBack1);

      sphere1Group.name = "sphere1Group";

      sphere1Group.position.x = (startRadius/2);

      scene.add(sphere1Group);

      objects.push(sphere1Group);

      ////////////
      // Arrows //
      ////////////

      var arrow = new THREE.Shape();
      arrow.moveTo(70.0, 12.3);
      arrow.lineTo(53.3, 24.6);
      arrow.lineTo(55.6, 17.8);
      arrow.bezierCurveTo(55.6, 17.8, 40.6, 16.1, 29.5, 15.0);
      arrow.bezierCurveTo(19.0, 13.9, 0.0, 12.3, 0.0, 12.3);
      arrow.bezierCurveTo(0.0, 12.3, 19.0, 10.8, 29.5, 9.7);
      arrow.bezierCurveTo(40.6, 8.5, 55.6, 6.8, 55.6, 6.8);
      arrow.lineTo(53.3, 0.1);
      arrow.lineTo(70.0, 12.3);

      var geometry = new THREE.ExtrudeGeometry(arrow, {
        bevelEnabled: false,
        bevelSegments: 0,
        steps: 2,
        amount: 3
      });

      //generate a bounding box for the general shape
      geometry.computeBoundingBox();

      //calculate the center point of the arrow
      var centreY = 0.5 * (geometry.boundingBox.max.y - geometry.boundingBox.min.y);

      geometry.applyMatrix(new THREE.Matrix4().makeTranslation(0, -centreY, 0))

      //ARROWS for sphereGroup

      //REPULSIVE FORCE

      arrowMeshRep = new THREE.Mesh(geometry, blueMaterialFront);
      arrowMeshRep1 = new THREE.Mesh(geometry, blueMaterialBack);

      //group the arrow
      arrowGroupRep = new THREE.Object3D();

      //assign the arrow to a parent group, not necessary if they are NOT going to be raycasted.
      arrowMeshRep.userData.parent = sphereGroup;
      arrowMeshRep1.userData.parent = sphereGroup;

      arrowGroupRep.add(arrowMeshRep);
      arrowGroupRep.add(arrowMeshRep1);

      arrowGroupRep.rotation.x = convertDeg(15);
      arrowGroupRep.rotation.z = convertDeg(180);


      scene.add(arrowGroupRep);
      sphereGroup.add(arrowGroupRep);

      //ATTRACTIVE FORCE
      arrowMeshAtt = new THREE.Mesh(geometry, redMaterialFront);
      arrowMeshAtt1 = new THREE.Mesh(geometry, redMaterialBack);

      arrowGroupAtt = new THREE.Object3D();

      arrowMeshAtt.userData.parent = sphereGroup;
      arrowMeshAtt1.userData.parent = sphereGroup;

      arrowGroupAtt.add(arrowMeshAtt);
      arrowGroupAtt.add(arrowMeshAtt1);

      
      arrowGroupAtt.rotation.x = convertDeg(-15);     

      scene.add(arrowGroupAtt);

      sphereGroup.add(arrowGroupAtt);
      
      //ARROW For Sphere1Group
      
      arrow1MeshRep = new THREE.Mesh(geometry, blueMaterialFront);
      arrow1MeshRep1 = new THREE.Mesh(geometry, blueMaterialBack);

      //group the arrow
      arrow1GroupRep = new THREE.Object3D();

      //assign the arrow to a parent group, they are part of the group, so need to be assigned a parent
      arrow1MeshRep.userData.parent = sphere1Group;
      arrow1MeshRep1.userData.parent = sphere1Group;

      arrow1GroupRep.add(arrow1MeshRep);
      arrow1GroupRep.add(arrow1MeshRep1);

      arrow1GroupRep.rotation.x = convertDeg(15);

      scene.add(arrow1GroupRep);
      sphere1Group.add(arrow1GroupRep);

      //ATTRACTIVE FORCE
      arrow1MeshAtt = new THREE.Mesh(geometry, redMaterialFront);
      arrow1MeshAtt1 = new THREE.Mesh(geometry, redMaterialBack);

      arrow1GroupAtt = new THREE.Object3D();

      arrow1MeshAtt.userData.parent = sphere1Group;
      arrow1MeshAtt1.userData.parent = sphere1Group;

      arrow1GroupAtt.add(arrow1MeshAtt);
      arrow1GroupAtt.add(arrow1MeshAtt1);

      
      arrow1GroupAtt.rotation.x = convertDeg(-15);
      arrow1GroupAtt.rotation.z = convertDeg(180);
      
      scene.add(arrow1GroupAtt);

      sphere1Group.add(arrow1GroupAtt);
      
      //NET FORCE ARROW

      var geometryNet = new THREE.ExtrudeGeometry(arrow, {
        bevelEnabled: false,
        bevelSegments: 0,
        steps: 2,
        amount: 3
      });


      //Need to set the matrix of the object to its direct center, prevents stretching in the wrong directions. 
      
      geometryNet.applyMatrix(new THREE.Matrix4().makeTranslation(-0.5 * (arrowMeshRep.geometry.boundingBox.max.x - arrowMeshRep.geometry.boundingBox.min.x), -centreY, 0))

      arrowMeshNet = new THREE.Mesh(geometryNet, purpMaterialFront);
      arrowMeshNet1 = new THREE.Mesh(geometryNet, purpMaterialBack);

      arrowGroupNet = new THREE.Object3D();

      arrowMeshNet.userData.parent = sphereGroup;
      arrowMeshNet1.userData.parent = sphereGroup;

      arrowGroupNet.add(arrowMeshNet);
      arrowGroupNet.add(arrowMeshNet1);

      //arrowGroupNet.rotation.x = convertDeg(-25);

      arrowGroupNet.position.y = radiusSphere * 8;
      arrowGroupNet.rotation.z = convertDeg(180);

      scene.add(arrowGroupNet);

      sphereGroup.add(arrowGroupNet);
      
      
      arrow1MeshNet = new THREE.Mesh(geometryNet, purpMaterialFront);
      arrow1MeshNet1 = new THREE.Mesh(geometryNet, purpMaterialBack);

      arrow1GroupNet = new THREE.Object3D();

      arrow1MeshNet.userData.parent = sphere1Group;
      arrow1MeshNet1.userData.parent = sphere1Group;

      arrow1GroupNet.add(arrow1MeshNet);
      arrow1GroupNet.add(arrow1MeshNet1);
      //arrowGroupNet.rotation.x = convertDeg(-25);

      arrow1GroupNet.position.y = radiusSphere * 8;

      scene.add(arrow1GroupNet);

      sphere1Group.add(arrow1GroupNet);


      //Add box around sphere1Group
      

      var cubeGeometry = new THREE.BoxGeometry( 100, 100, 100, 1, 1, 1 );
      // using THREE.MeshFaceMaterial() in the constructor below
       //   causes the mesh to use the materials stored in the geometry
       var cubeMaterials = new THREE.MeshBasicMaterial( { color: 0x000000, wireframe: true, transparent: true } ); 
       cube = new THREE.Mesh( cubeGeometry, cubeMaterials );
       cube.position.set(0, 0, 0);
       cube.rotation.x = convertDeg(-5);
       cube.rotation.y = convertDeg(5);
       //scene.add( cube );
      
      ///////////
      //  TEXT //
      ///////////
      // create a canvas element
      var canvas1 = document.createElement('canvas');
      var context1 = canvas1.getContext('2d');
      context1.font = "14px Tahoma";
      context1.fillStyle = "rgba(0,0,0,0.65)";
      context1.fillText('Drag a sphere to adjust the system!', 0, 20);
    
      // canvas contents will be used for a texture
      var texture1 = new THREE.Texture(canvas1) 
      texture1.needsUpdate = true;
      //set this to LinearFilter to prevent warning.
      texture1.minFilter = THREE.LinearFilter;
            
      var material1 = new THREE.MeshBasicMaterial( {map: texture1, side:THREE.DoubleSide} );
      material1.transparent = true;

      var mesh1 = new THREE.Mesh(
          new THREE.PlaneBufferGeometry(canvas1.width, canvas1.height),
          material1
        );

        mesh1.name = "text";
        mesh1.position.set(0,-150,0);
        scene.add( mesh1 );
      
               
      //These are listening for clicks of the mouse on the screen.
      renderer.domElement.addEventListener('mousemove', onDocumentMouseMove, false);
      renderer.domElement.addEventListener('mousedown', onDocumentMouseDown, false);
      renderer.domElement.addEventListener('mouseup', onDocumentMouseUp, false);

    }


    //this functions figures out the total offset of the element you are searching
      //it goes up the the parent chain, to determine the absolute position
      function findPos(obj) {
        var curleft = curtop = 0;
        if (obj.offsetParent) {
          do {
              curleft += obj.offsetLeft;
              curtop += obj.offsetTop;
              } 
          while (obj = obj.offsetParent);
          return [curleft,curtop];
        }
      }



    //quick function for converting degrees into radians.
    function convertDeg(deg) {
      var degToRad = (Math.PI / 180) * deg;
      return degToRad;
    }


     //The below functions are for the movement of the balls. Have to adjust the mouse x and y to 
     //correspond to the current position of the mouse. 
    function onDocumentMouseMove(event) {
      event.preventDefault();

      var offsetArr = findPos(renderer.domElement);

      // have to use the render.domElement.offset, in order to have the 3D assets anywhere on the page. 
       mouse.x = ((event.clientX - offsetArr[0]) / renderer.domElement.width) * 2 - 1;
        mouse.y = -((event.clientY - offsetArr[1]) / renderer.domElement.height) * 2 + 1;

      // raycaster is the way of determining the selection. It is based on the mouse position and the camera angle within
      // the scene.
      raycaster.setFromCamera(mouse, camera);

      //if an object is selected, do what is inside this if statement
      if (SELECTED) {

        container.style.cursor = 'none';

        //Moves the parent object and all its children.
        var intersects = raycaster.intersectObject(plane);
        
        //otherSphere will hold the position at the mouse down. 
        var otherSphere = {};

        if (SELECTED.name == "sphereGroup") 
        {
          otherSphere.x = sphere1Group.position.x;
        }
        else otherSphere.x = sphereGroup.position.x;

        radius = Math.abs(sphereGroup.position.x - sphere1Group.position.x);

        //selectedStartPos is the starting position, from the mouse down event, before the moving occurs.

        //maxDistance defines the starting difference between the two spheres.
        var maxDistance = selectedStartPos - otherSphere.x;

        //measures the current difference between the two spheres
        var currentDistance = intersects[0].point.x - otherSphere.x;

        //prevents the sphere from being moved out of the canvas. 
        if (SELECTED.position.x < (-width/2 + (radiusSphere*8))){
          SELECTED.position.x = (-width/ 2 + (radiusSphere*9))
          SELECTED = null;
        }
        else if (SELECTED.position.x > (width/2 - (radiusSphere*8))) {
          SELECTED.position.x = (width/2 - (radiusSphere*9));
          SELECTED = null;
        }
        //Have to try to dampen the mouse. Will use the starting positions, the starting difference in distance, the current difference
        // in distance and the equilibrium position.
        else if (selectedStartPos > otherSphere.x) { 
            if (!(SELECTED.position.x <= (otherSphere.x + radiusSphere*9))) {
                SELECTED.position.x = intersects[0].point.x;
           }
           else {
             SELECTED.position.x = otherSphere.x + radiusSphere*12;
             SELECTED = null;
           }

         }

        //If the selectedSphere is to the left.
        else {
          if (!(SELECTED.position.x > (otherSphere.x - radiusSphere*9))) {
            SELECTED.position.x = intersects[0].point.x;
          }
          else {
            SELECTED.position.x = otherSphere.x - radiusSphere*12;
            SELECTED = null;
          }

        }
        //need to update the radius while moving the ball around.... 
        //radius = Math.abs(sphereGroup.position.x - sphere1Group.position.x);     
      }

      //by setting the second argument to try, you also select the children of whatever is in objects.
      var intersects = raycaster.intersectObjects(objects, true);

      if (intersects.length > 0 && !SELECTED) {
        if (INTERSECTED != intersects[0].object) {
          INTERSECTED = intersects[0].object;
          plane.position.copy(INTERSECTED.position);
          plane.lookAt(camera.position);
        }
        container.style.cursor = 'pointer';      
      } else if (!SELECTED){
        INTERSECTED = null;       
        container.style.cursor = 'auto';
      }
    }


    function onDocumentMouseDown(event) {
      event.preventDefault();

      var intersects = raycaster.intersectObjects(objects, true); //by setting the second argument to try, you also select the children and parent of whatever is in objects.

      mouseDown = true;
    
      window.removeEventListener('mousedown', onDocumentMouseDown, false);
      window.addEventListener('mouseup', onDocumentMouseUp, false);

      if (intersects.length > 0) {
        //Define the selected as the parent.
        SELECTED = intersects[0].object.userData.parent;

        //Set the original position for the sphere. 
        selectedStartPos = SELECTED.position.x; 

        var intersects = raycaster.intersectObject(plane);
        container.style.cursor = 'move';
        //container.style.cursor = 'none';

        if (!clicked) {
          var selectText = scene.getObjectByName("text");
          scene.remove( selectText );
          clicked = true;
        }

        //we set velocities to zero when object is moved, this prevents initial movement in the incorrect direction.
        spherePhys.v = 0;
        sphere1Phys.v = 0;
        Fnet = 0;
        Frep = 0;
        Fatt = 0;

      }
    }

    function onDocumentMouseUp(event) {
      event.preventDefault();
      SELECTED = null;
      window.removeEventListener('mouseup', onDocumentMouseUp, false);
      window.addEventListener('mousedown', onDocumentMouseDown, false);

      mouseDown = false;

      if (INTERSECTED) {
        plane.position.copy(INTERSECTED.position);
      }
      
      container.style.cursor = 'auto';
    }

    function animate() {
      requestAnimationFrame(animate);
      render();
    }

    function render() {
        //Wrap it in timeout so that is only runs when the current $watch cycles is over. 
        //assigns the variable to scope variable.
        $timeout(function() {
        scope.$apply(function() {
          exp.assign(scope.$parent, radius);
          });
        });

        if (!mouseDown) {

        // Variables 
        // radius here refers to the internuclear distance
        radius = Math.abs(sphereGroup.position.x - sphere1Group.position.x);

        // Physics part of this code is taken from the physics tutorial http://burakkanber.com/blog/physics-in-javascript-car-suspension-part-1-spring-mass-damper/
        // Two forces, electrostatic_att electrostatic_rep. Have to balance the forces based on   

        // for simplicity, attractive force is always positive, thus reversing the acceleration is only necessary when
        // the sphere is to the right of the other sphere
        
        //also for now, the forces experienced by both balls are equivalent, and mass/charge quantities cannot be changes.
        //it can be expanded at a later date.

        frameRate = 1 / 8;
      
        var dampenCon = -0.04;

        //Will use a piece-wise function to graph out the changes. A lot easier than trying to come up with a single golden equation without 
        //graphing 

        if (radius < firstBreak) {
          Frep = ForceRepAtFirst;
          Fatt = ForceAttAtFirst;
        } 
        else if (radius >= firstBreak && radius < secondBreak) {
          Frep = Frep2Obj.m * radius + Frep2Obj.b;
          Fatt = Fatt2Obj.m * radius + Fatt2Obj.b;
        } 
        else if (radius >= secondBreak && radius < thirdBreak) {
          Frep = Frep3Obj.m * radius + Frep3Obj.b;
          Fatt = Fatt3Obj.m * radius + Fatt3Obj.b;
        } 
        else if (radius >= thirdBreak && radius < fourthBreak) {
          //Frep = Frep4Obj.C/(radius - Frep4Obj.xo);  //if you want to define as an inverse relationship (leads to jumpiness)
          //Fatt = Fatt4Obj.C/(radius - Fatt4Obj.xo);
          Frep = Frep4Obj.m * radius + Frep4Obj.b;
          Fatt = Fatt4Obj.m * radius + Fatt4Obj.b;
        } 
        else if (radius >= fourthBreak) {
          Frep = ForceRepAtFourth;
          Fatt = ForceAttAtFourth;
        }
  
        //sphereGroup phyiscs below

        //if the sphere is to the left, attractive force points to the right.
        if (sphereGroup.position.x < sphere1Group.position.x) {
          var Fsum = Fatt - Frep;
        }
        else {
          var Fsum = Frep - Fatt;
        }          

        //dampening force, Fdampen is negative cause of dampenCon
        if (Math.abs(spherePhys.v) < 3) {
          var dampenCon = -0.001;
          var Fdampen = dampenCon * spherePhys.v;
        } else {
          var Fdampen = dampenCon * spherePhys.v;
        }
        
        var Fnet = Fsum + Fdampen;

        var a = Fnet / sphereMass;

        spherePhys.v += a * frameRate;

        if (sphereGroup.position.x <= (-width/2 + radiusSphere*2) || sphereGroup.position.x >= (width/2 - radiusSphere*2)) {
          spherePhys.v = -spherePhys.v;
        }

        sphereGroup.position.x += spherePhys.v * frameRate;

        //sphere1Group physics below. Shares Fatt and Frep. 

        if (sphere1Group.position.x < sphereGroup.position.x) {
          var Fsum1 = Fatt - Frep;
        }
        else {
          var Fsum1 = Frep - Fatt;
        } 

        //dampening force, Fdampen is negative cause of dampenCon
        if (Math.abs(sphere1Phys.v) < 3) {
          var Fdampen1 = 0;
        } else {
          var Fdampen1 = dampenCon * sphere1Phys.v;
        }

        var Fnet1 = Fsum1 + Fdampen1;

        var a1 = Fnet1 / sphere1Mass;

        sphere1Phys.v += a1 * frameRate;

        if (sphere1Group.position.x <= (-width/2 + radiusSphere*8) || sphere1Group.position.x >= (width/2 - radiusSphere*8)) {
          sphere1Phys.v = -sphere1Phys.v;
        }

        sphere1Group.position.x += sphere1Phys.v * frameRate;

         
        //variables
        
        //Arrows for the "SphereGroup"
             
        var arrowScaling = 30;
        var arrowNetScaling = 5;


        if (sphereGroup.position.x > sphere1Group.position.x) {
          Frep = -Frep;
          Fatt = -Fatt;
        }
        arrowGroupRep.scale.set( Frep / arrowScaling,  Frep / arrowScaling, 1);
        arrowGroupAtt.scale.set( Fatt / arrowScaling,  Fatt / arrowScaling, 1);

        arrowGroupNet.scale.set(-Fnet/arrowNetScaling, -Fnet/arrowNetScaling, 1)
        
        //Arrows for the "SphereGroup1" Because this is switched, one set of arrows is darker then the other
        // maybe try and fix this later

        arrow1GroupRep.scale.set( Frep / arrowScaling,  Frep / arrowScaling, 1);
        arrow1GroupAtt.scale.set( Fatt / arrowScaling,  Fatt / arrowScaling, 1);

        arrow1GroupNet.scale.set(Fnet1/arrowNetScaling, Fnet/arrowNetScaling, 1);


      }
       renderer.render(scene, camera);
     }
    
      return {
        scene: scene,
      }
    }
  }
});