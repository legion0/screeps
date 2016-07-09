
module.exports = function(grunt) {

    grunt.loadNpmTasks('grunt-screeps');

    grunt.initConfig({
        screeps: {
            options: {
                branch: 'default',
                ptr: true
            },
            dist: {
                src: ['src/*.js']
            }
        }
    });
}
