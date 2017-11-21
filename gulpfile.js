/*global require console*/
/*eslint strict: ["error", "never"]*/
var fsExtra = require('fs-extra');
var path = require('path');
var gulp = require('gulp');
var jsonServer = require('json-server');
var browserSync = require('browser-sync').create();

var dbDir = 'db';
var dbName = 'data.json';
var dbJson = {
    'name': []
};
var dbPath = path.join(dbDir, dbName);
var server = jsonServer.create();
var router = jsonServer.router(dbPath);
var middlewares = jsonServer.defaults();

gulp.task('recreateDb', function() {
    fsExtra.removeSync(dbPath);
    fsExtra.writeJsonSync(dbPath, dbJson);
});

gulp.task('db', ['recreateDb'], function() {

    server.use(middlewares);
    server.use(router);
    server.listen(3000, function() {
        console.log('JSON Server is running');
    });
});

gulp.task('server', ['db'], function() {
    browserSync.init({
        server: {
            baseDir: './'
        },
        port: 3001
    });
});
