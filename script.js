// Code goes here

var app = angular.module('sphereApp', []);

app.controller('sphereController', ['$scope',
  function($scope) {
  	var startRadius = 300;
    $scope.startRadius = {value: startRadius};
  }
]);
