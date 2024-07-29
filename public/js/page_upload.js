import { initLightshow } from './initLightshow.js';
initLightshow();

const dropArea = document.getElementById('drop_area');
const fileInput = document.getElementById('modeFile');
const fileError = document.getElementById('fileError');
const progressBar = document.getElementById('progressBar');
const progress = document.getElementById('progress');

fileInput.addEventListener('change', function() {
    fileError.style.display = 'none';
});

dropArea.addEventListener('dragenter', preventDefaults, false);
dropArea.addEventListener('dragover', preventDefaults, false);
dropArea.addEventListener('dragleave', preventDefaults, false);
dropArea.addEventListener('drop', preventDefaults, false);

function preventDefaults (e) {
    e.preventDefault();
    e.stopPropagation();
}

dropArea.addEventListener('dragenter', highlight, false);
dropArea.addEventListener('dragover', highlight, false);
dropArea.addEventListener('dragleave', unhighlight, false);
dropArea.addEventListener('drop', unhighlight, false);

function highlight(e) {
    dropArea.classList.add('highlight');
}

function unhighlight(e) {
    dropArea.classList.remove('highlight');
}

dropArea.addEventListener('drop', handleDrop, false);

function handleDrop(e) {
    let dt = e.dataTransfer;
    let files = dt.files;
    fileInput.files = files;
    fileError.style.display = 'none';
}

document.getElementById('uploadForm').addEventListener('submit', function(e) {
    const files = fileInput.files;
    if (files.length === 0) {
        fileError.textContent = "Please select a .vtxmode file.";
        fileError.style.display = 'block';
        e.preventDefault();
    } else {
        const validFiles = Array.from(files).every(file => file.name.endsWith('.vtxmode'));
        if (!validFiles) {
            fileError.textContent = "Invalid file type. Please upload .vtxmode files only.";
            fileError.style.display = 'block';
            e.preventDefault();
        } else {
            progressBar.style.display = 'block';
            progress.style.width = '0%';
            const xhr = new XMLHttpRequest();
            xhr.upload.onprogress = function(event) {
                if (event.lengthComputable) {
                    const percentComplete = (event.loaded / event.total) * 100;
                    progress.style.width = percentComplete + '%';
                }
            };
            xhr.onload = function() {
                if (xhr.status === 200) {
                    progress.style.width = '100%';
                } else {
                    fileError.textContent = "An error occurred during upload.";
                    fileError.style.display = 'block';
                }
            };
            xhr.open('POST', '/upload', true);
            const formData = new FormData(document.getElementById('uploadForm'));
            xhr.send(formData);
            e.preventDefault();
        }
    }
});

