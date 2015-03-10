// Code goes here

var app = angular.module('sphereApp', []);

app.controller('sphereController', ['$scope',
  function($scope) {	
  	var startRadius = 300;
  	//important for the radius to be the same on all javascript elements starting positions.
    $scope.startRadius = {value: startRadius};
  }
]);
