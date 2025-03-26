const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src', 'renderer');
const distDir = path.join(__dirname, 'dist', 'renderer');

// Ensure dist directory exists
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
}

// Copy initial files
copyFiles();

// Watch for changes
fs.watch(srcDir, (eventType, filename) => {
    if (filename) {
        if (filename.endsWith('.html') || filename.endsWith('.css')) {
            console.log(`File ${filename} changed. Copying...`);
            copyFiles();
        }
    }
});

function copyFiles() {
    try {
        fs.copyFileSync(
            path.join(srcDir, 'index.html'),
            path.join(distDir, 'index.html')
        );
        fs.copyFileSync(
            path.join(srcDir, 'styles.css'),
            path.join(distDir, 'styles.css')
        );
        console.log('Renderer files copied successfully');
    } catch (error) {
        console.error('Error copying files:', error);
    }
} 