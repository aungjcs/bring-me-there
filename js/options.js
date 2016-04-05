function main() {

    var app = angular.module( 'extApp', ['mgcrea.ngStrap']);

    app.controller( 'BodyCtrl', ['$scope', '$injector', function( $scope, $injector ) {

        var $timeout = $injector.get( '$timeout' );
        var $ = angular.element;
        var view = $scope.view = {
            clearHashHost: [],
            tasks: [],
            types: ['click', 'text']
        };

        $scope.taskChanged = function() {

            storeSetting({
                tasks: view.tasks
            });
        };

        $scope.setFocus = function( $event ) {

            $timeout(function() {

                $( $event.target ).siblings( 'input' ).focus();

            }, 10 );
        };

        $scope.addTask = function() {

            var newTask = {
                id: new Date().getTime(),
                selector: 'div#container .search button[ng-click*=addSomething]',
                type: 'click',
                wait: 0,
                memo: 'new'
            };

            view.tasks.push( newTask );

            storeSetting({
                tasks: view.tasks
            });

            $scope.$applyAsync( setSortable );
        };

        $scope.removeTask = function( task ) {

            view.tasks = view.tasks.filter(function( v ) {

                return task.id !== v.id;
            });

            storeSetting({
                tasks: view.tasks
            });
            $scope.$applyAsync( setSortable );
        };

        $scope.clearTasks = function() {

            chrome.storage.local.removeAsync( 'tasks' ).then(function() {

                view.tasks.length = 0;
                $scope.$applyAsync();
            });

            $scope.$applyAsync( setSortable );
        };

        function setSortable() {

            $( '#tasks-table ' ).sortable({
                items: 'tr.task-row',
                handle: '.change-order',
                revert: true,
                placeholder: 'bg-warning sortable-placeholder',
                update: sorttableUpdated
            });
        }

        function sorttableUpdated( event, ui ) {

            var mapTasks = {};
            var $rows = ui.item.closest( 'tbody' ).find( '.task-row' );
            var sortted = [];

            view.tasks.forEach(function( v ) {

                mapTasks[v.id] = v;
            });

            view.tasks.length = 0;

            $rows.each(function() {

                var $r = $( this );
                var id = $r.data( 'task-id' );

                view.tasks.push( mapTasks[id] );
            });

            $scope.taskChanged();
            $scope.$applyAsync();
        }

        chrome.storage.local.getAsync(['setting', 'tasks']).then(function( storage ) {

            var setting = storage.setting || {};

            $scope.view.clearHashHost = setting.clearHashHost || [];
            $scope.view.tasks = storage.tasks || [];

            $scope.$applyAsync( setSortable );
        });

        function storeSetting( setting ) {

            return chrome.storage.local.setAsync( setting ).then(function() {

                console.log( 'saved' );
            });
        }
    }]);
}

main();
