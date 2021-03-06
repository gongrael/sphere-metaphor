app.directive('sphereChart', function($parse, $window, $log) {
  return {
    restrict: 'EA',
    //replace: true,
    //directives need a template, places down the SVG holder for the d3 objects
    //could do it using d3, most likely.
    //
    //
    template: "<svg class='centred'><g class='forTrace'></g></svg>",
    // link is a function used to modify the DOM, great for updating positions 
    link: function(scope, elem, attrs) {

      //defining some variables
      var xScale, yScale, xAxisGen, yAxisGen;
      var newPoint = false; //this is for controlling when a new ball is drawn. 
      var oldValue = "";

      //parses all the data found in the attribute ball-data, in this case it will grab the data represeted by ballX. 
      //Parse creates a function of sorts, which can be fed a specific scope? Not 100% sure, need to read more.
      var exp = $parse(attrs.sphereDataChart);

      //saving the data to a variable, it returns the data, probably done so that you don't have to feed 
      //scope back into the data. not super important
      var interNucDistance = exp(scope);

      //by using window, you have access to more information, allows you to troubleshoot easier. 
      var d3 = $window.d3;

      //grabs the element that is equal to svg.
      var rawSvg = elem.find('svg');

      //is a selection for that svg.
      var svg = d3.select(rawSvg[0]);

      var width = 600;
      var height = 400;

      svg.attr({
        "width" : width,
        "height" : height
      });

      var leftPad = 50;
      var topPad = 40;
      var textPad = 15;
      var yPad = 10;


      //variables for Morse Potential
      //
      //De will be the energy when the internuclear distance is very large.
      var De = 200;

      //Beta is not necessary for now, so it will be excluded. 
      var Beta = 2;

      //This means the max value power to raise e is 10. 
      var actualEquilRadius = 200;
     
      var Req = 3;

      var Bconstant = 20;

      //proper graph shape is the expression below
      //50*((1-e^(-1*(x-5))))^2 + 100
      
      //corrected graph shape.      
      //De*(Math.pow((1- Math.pow(Math.E, -1*(correctedRadius-Req))), 2)) + 100;

      //corrected so that the equilibrium positions match up.       
      var correctedRadius = interNucDistance * Req/actualEquilRadius;

    
      //for the trace
      var dataSet = [{
        x: interNucDistance,
        //y: 360 - (interNucDistance) * (interNucDistance) / 4
        //y: De*(1 - Math.pow(Math.E, -Beta*(interNucDistance -Req)))
        y: (height-topPad) - (De*(Math.pow((1- Math.pow(Math.E, -1*(correctedRadius-Req))), 2)) + Bconstant)
      }]

      //start evaluating the max and min values in the data set
      var maxAndMin = maxOrMin(dataSet);
     
      // defines the function that will be used to make the path.      
      var lineFunc = d3.svg.line()
        .x(function(d) {
          return d.x;
        })
        .y(function(d) {
          return d.y;
        })
        .interpolate('basis');


      // This function checks the value of the number, compares it to a global max and min, and resets the global variables minX and maxX.
        function maxOrMin (dataArray) {

        var maxX = dataArray[0].x;      
        var minX = dataArray[0].x;

        for (var i = 0; i < dataArray.length ; i++) {
          if (dataArray[i].x >= maxX) {
            maxX = Math.round(dataArray[i].x);
          }
          if (dataArray[i].x <= minX) {
            minX = Math.round(dataArray[i].x);
          }
        }
        var maxAndMin = {"max": maxX, "min": minX};
        return maxAndMin; 
      }   

      //$watchCollection for changes in a collection of variables (ie. matrices or objects), if there are any changes 
      //a newValue is obtained, we then set the newValue of interNucDistance. 
      // use exp, which is the parsed version of attrs.ballData.
      // redrawBallChart() is called, which changes the position of the ball
      // traceball() is also called, it places a new ball onto the chart. 
      scope.$watch(exp, function(newVal, oldVal) {
        if (newVal != oldVal) {
          oldValue = oldVal;
          interNucDistance = newVal;
          correctedRadius = interNucDistance * Req/actualEquilRadius;
          traceBall()
          redrawBallChart();
          maxAndMin = maxOrMin(dataSet);
        }
      })

      // trace ball is way of leaving a trace for the movement of the ball, highlighting the
      // resulting graph. The trace now relies on a data set, which is updated whenever the ball moves.
      // the line and a resulting path is used to draw the new trace.
      // the if statements are in place to prevent noise in the graph by rapid movement of the balls
      // also, to stop the writing of new data points once the trace is completed. 
       function traceBall() {
          if (Math.round(interNucDistance) < maxAndMin.min) {
            newPoint = true;
            dataSet.push({
               x: interNucDistance,
               //y: De*(1 - Math.pow(Math.E, -Beta*(interNucDistance -Req)))
               y: (height-topPad) - (De*(Math.pow((1- Math.pow(Math.E, -1*(correctedRadius-Req))), 2)) + Bconstant)
            });
          }
          else if (Math.round(interNucDistance) > maxAndMin.max) {
            newPoint = true;
            dataSet.push({
                x: interNucDistance,
                //y: De*(1 - Math.pow(Math.E, -Beta*(interNucDistance -Req)))
                y: (height-topPad) - (De*(Math.pow((1- Math.pow(Math.E, -1*(correctedRadius-Req))), 2)) + Bconstant)
            });
          }
          // use the array sort method in conjunction with a simple function, that points the sorter to the object property.
          dataSet.sort(compare);        
      }


      //this is a function that sorts the data. specific to an array with objects that have the property x.  
      function compare(a,b) {
        if (a.x < b.x)
           return -1;
        if (a.x > b.x)
          return 1;
        return 0;
      }

      // This sets the scaling for the entire graph. Adjusting these values will properly align the axis
      // need to be careful when manipulating these values. Best thing is to make it as responsive as possible
      // by using variables. We place this in a setChartParameters function so it can be called again and used
      // to update the display if necessary. 

      function setChartParameters() {

        // use the domain to specify the lowest and highest value possible
        // use the range to confine this range to certain dimensions. 
        xScale = d3.scale.linear()
         // distance between spheres
          .domain([0, 600])
          .range([0, (rawSvg.attr("width") -leftPad - textPad)]);

        yScale = d3.scale.linear()
          .domain([0, 500])
          .range([ (rawSvg.attr("height") - topPad - textPad -yPad), 0]);

        xAxisGen = d3.svg.axis()
          .scale(xScale)
          .orient("bottom")
          .ticks(4);

        yAxisGen = d3.svg.axis()
          .scale(yScale)
          .orient("left")
          .ticks(5);
      }

      function drawBallChart() {

        setChartParameters();

        // adds the axis to the svg. They are added grouped together.
        // .call allows you to call a set of pre-definied features, so you don't have
        // to repreat them over again. Allows for easier updating. 
        // svg:g allows you to add a group to the svg. 
        // the attribute transform allows you to move an entire group at once.
        svg.append("svg:g")
          .attr("class", "x axis")
          .attr("transform", "translate("+ leftPad +", "+ (height-topPad-textPad) +")")
          //.attr("transform", "translate("+ leftPad +", "+ 360 +")")
          .call(xAxisGen);

        svg.append("svg:g")
          .attr("class", "y axis")
          .attr("transform", "translate("+ leftPad +", "+ yPad +")")
          .call(yAxisGen);

        svg.append("text")
          .attr("transform", "translate(" + (width - leftPad)/2 + " ," + (height-textPad) + ")")
          .attr("class", "axislabels")
          .style("text-anchor", "middle")
          .text("Distance between spheres(mm)");

        svg.append("text")
          .attr("transform", "rotate(-90)")
          .attr("y", 0)
          .attr("x", -180)
          .attr("dy", "1em")
          .attr("class", "axislabels")
          .style("text-anchor", "middle")
          .text("Potential Energy (J)");

        // adds the circle that will be manipulated over time and updated. 
        // use class to give it an identifier that allows it to be manipulated easily. 
        svg.append("circle")
          .attr({
            cx: interNucDistance,
            //cy: 360 - (interNucDistance) * (interNucDistance) / 4,
            //cy: De*(1 - Math.pow(Math.E, -Beta*(interNucDistance -Req))),
            cy: (height-topPad) - (De*(Math.pow((1- Math.pow(Math.E, -1*(correctedRadius-Req))), 2)) + Bconstant),
            r: 3,
            "fill": "#dd4545",
            "class": "solid",
            "transform": "translate(-10)"
          });

        d3.select(".forTrace")
          .append("svg:path")
          .attr("transform", "translate(-10)")
          .attr("d", lineFunc(dataSet))
          .attr("stroke", "grey")
          .attr("stroke-width", 1)
          .attr("fill", "none");
      }

      // this gets function gets run when the watch function detects a new value for 
      // the data model. THe function simple changes the position of the ball solid. 

      function redrawBallChart() {
        //setChartParameters();
        // svg.selectAll("g.y.axis").call(yAxisGen);
        // svg.selectAll("g.x.axis").call(xAxisGen);

       //selects all objects with the class solid, only one ball has that class in this case. 
        
        svg.selectAll(".solid")
          .attr({
            cx: interNucDistance,
            //cy: 360 - (interNucDistance) * (interNucDistance) / 4,
            //cy: De*(1 - Math.pow(Math.E, -Beta*(interNucDistance -Req)))
            cy: (height-topPad) - (De*(Math.pow((1- Math.pow(Math.E, -1*(correctedRadius-Req))), 2)) + Bconstant)
          });

          //it appears that when a line is included on the graph, performance goes down, might be another reason.

        if (newPoint) {
        svg.select(".forTrace path")
          .attr("d", lineFunc(dataSet))
         newPoint = false;
        }
      }
      
      drawBallChart();
    }
  };
});