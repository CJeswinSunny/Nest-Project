document.addEventListener('DOMContentLoaded', () => {
    // Basic navigation toggle
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');

    if (navToggle && navLinks) {
        navToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }

    // Auto-dismiss flash messages after 5 seconds
    const flashMessages = document.querySelectorAll('.flash');
    flashMessages.forEach(flash => {
        setTimeout(() => {
            flash.style.opacity = '0';
            flash.style.transition = 'opacity 0.3s ease';
            setTimeout(() => {
                flash.remove();
            }, 300);
        }, 5000);
    });

    // File upload preview handling
    const fileInput = document.getElementById('file');
    const fileUploadArea = document.getElementById('fileUploadArea');
    const filePreview = document.getElementById('filePreview');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');

    if (fileInput && fileUploadArea) {
        // Drag over effects
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            fileUploadArea.addEventListener(eventName, preventDefaults, false);
        });

        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        ['dragenter', 'dragover'].forEach(eventName => {
            fileUploadArea.addEventListener(eventName, highlight, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            fileUploadArea.addEventListener(eventName, unhighlight, false);
        });

        function highlight(e) {
            fileUploadArea.classList.add('dragover');
        }

        function unhighlight(e) {
            fileUploadArea.classList.remove('dragover');
        }

        fileUploadArea.addEventListener('drop', handleDrop, false);

        function handleDrop(e) {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files.length > 0) {
                fileInput.files = files; // Assign files to input
                updateFilePreview();
            }
        }

        // Handle file browse
        fileInput.addEventListener('change', updateFilePreview);

        function updateFilePreview() {
            if (fileInput.files.length > 0) {
                const file = fileInput.files[0];
                fileName.textContent = file.name;

                // Format size
                let size = file.size;
                let sizeStr = '';
                if (size < 1024) {
                    sizeStr = size + ' B';
                } else if (size < 1024 * 1024) {
                    sizeStr = (size / 1024).toFixed(1) + ' KB';
                } else {
                    sizeStr = (size / (1024 * 1024)).toFixed(2) + ' MB';
                }
                fileSize.textContent = sizeStr;

                filePreview.style.display = 'flex';
                // Hide default text
                const textElements = fileUploadArea.querySelectorAll('.file-upload-text, .file-upload-hint');
                textElements.forEach(el => el.style.display = 'none');
            }
        }
    }
});
