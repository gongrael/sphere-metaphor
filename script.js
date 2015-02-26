// Code goes here

var app = angular.module('ballApp', []);

app.controller('ballController', ['$scope',
  function($scope) {
    $scope.ballX = {value:50};
  }
]);
