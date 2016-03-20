function main() {

    var app = angular.module( 'extApp', ['mgcrea.ngStrap']);

    app.controller( 'BodyCtrl', ['$scope', '$injector', function( $scope, $injector ) {

        var view = $scope.view = {
            clearHashHost: [],
            tasks: [],
            types: ['click', 'text']
        };

        $scope.typeChanged = function () {
            
            storeSetting({
                tasks: view.tasks
            });
        };

        $scope.addTask = function() {

            var newTask = {
                id: new Date().getTime(),
                selector: 'div#container .search button[ng-click*=addSomething]',
                type: 'click'
            };

            view.tasks.push( newTask );

            storeSetting({
                tasks: view.tasks
            });
        };

        $scope.removeTask = function( task ) {

            view.tasks = view.tasks.filter(function( v ) {

                return task.id !== v.id;
            });

            storeSetting({
                tasks: view.tasks
            });
        };

        $scope.clearTasks = function() {

            chrome.storage.local.removeAsync( 'tasks' ).then(function() {

                view.tasks.length = 0;
                $scope.$applyAsync();
            });
        };

        chrome.storage.local.getAsync( ['setting', 'tasks'] ).then(function( storage ) {

            var setting = storage.setting || {};

            $scope.view.clearHashHost = setting.clearHashHost || [];
            $scope.view.tasks = storage.tasks || [];

            console.log( 'tasks', storage );

            $scope.$applyAsync();
        });

        function storeSetting( setting ) {

            return chrome.storage.local.setAsync( setting ).then(function() {

                console.log( 'saved', arguments );
            });
        }
    }]);
}

main();
