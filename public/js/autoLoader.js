var path = window.location.pathname;
var segments = path.split("/").filter(Boolean); // Filter out empty segments

var page = segments.join('_'); // Join all segments with an underscore to form the script name
if (page.length == 0) {
  page = 'home';
}
var scriptName = 'page_' + page + '.js';
var scriptPath = '/js/' + scriptName;

// if the script for this page exists then load it
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

