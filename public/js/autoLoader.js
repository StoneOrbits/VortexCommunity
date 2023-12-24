var path = window.location.pathname;
var segments = path.split("/").filter(Boolean); // Filter out empty segments

var page = segments.length > 0 ? segments[0] : 'home'; // Default to 'home' if no significant segment

var scriptName = 'page_' + page + '.js';
var scriptPath = '/js/' + scriptName;

var script = document.createElement('script');
script.src = scriptPath;
script.type = 'module'; // Specify that the script is a module
script.onload = function() {
    console.log(scriptName + ' loaded successfully.');
};
script.onerror = function() {
    console.log('Error loading script: ' + scriptName);
};

document.body.appendChild(script);
