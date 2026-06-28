const fs = require('fs');
const path = require('path');

function getCssFiles(dir, files = []) {
    const items = fs.readdirSync(dir);
    
    items.forEach(item => {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            getCssFiles(fullPath, files);
        } else if (stat.isFile() && item.endsWith('.css')) {
            files.push(fullPath);
        }
    });
    
    return files;
}

module.exports = (req, res, next) => {
    const cssDir = path.join(__dirname, '../public/css');
    const cssFiles = getCssFiles(cssDir);
    const basePath = req.app.locals.basePath || '';
    
    res.locals.pageStyles = cssFiles.map(file => {
        return basePath + '/css' + file.replace(cssDir, '').replace(/\\/g, '/');
    });

    next();
};
