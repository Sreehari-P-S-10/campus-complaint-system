// ============================================
// Create Complaint Module
// Handles complaint form with file upload
// ============================================

$(document).ready(function () {
    // ---- CHECK AUTH ----
    let currentUser = null;

    $.ajax({
        url: '/api/me',
        method: 'GET',
        xhrFields: { withCredentials: true },
        success: function (response) {
            if (response.success && response.data) {
                currentUser = response.data;
                $('#userName').text(currentUser.name);
                $('#userAvatar').text(currentUser.name.charAt(0).toUpperCase());
            } else {
                window.location.href = '/login';
            }
        },
        error: function () {
            window.location.href = '/login';
        }
    });

    // ---- FILE UPLOAD HANDLING ----
    let selectedFiles = [];

    // Click to browse
    $('#fileUploadArea').on('click', function () {
        $('#fileInput').click();
    });

    // Drag and drop
    $('#fileUploadArea').on('dragover', function (e) {
        e.preventDefault();
        $(this).addClass('dragover');
    });

    $('#fileUploadArea').on('dragleave', function () {
        $(this).removeClass('dragover');
    });

    $('#fileUploadArea').on('drop', function (e) {
        e.preventDefault();
        $(this).removeClass('dragover');
        const files = e.originalEvent.dataTransfer.files;
        addFiles(files);
    });

    // File input change
    $('#fileInput').on('change', function () {
        addFiles(this.files);
        $(this).val(''); // Reset so same file can be selected again
    });

    function addFiles(files) {
        for (let i = 0; i < files.length; i++) {
            if (selectedFiles.length >= 5) {
                showToast('Maximum 5 files allowed.', 'warning');
                break;
            }
            if (files[i].size > 5 * 1024 * 1024) {
                showToast(`File "${files[i].name}" exceeds 5MB limit.`, 'error');
                continue;
            }
            selectedFiles.push(files[i]);
        }
        renderFileList();
    }

    function renderFileList() {
        const list = $('#fileList');
        list.empty();

        if (selectedFiles.length === 0) {
            list.hide();
            return;
        }

        list.show();
        selectedFiles.forEach(function (file, index) {
            const size = (file.size / 1024).toFixed(1);
            list.append(`
                <div class="file-list-item">
                    <span>📄 ${escapeHtml(file.name)} <small style="color: var(--text-muted);">(${size} KB)</small></span>
                    <button class="remove-file" data-index="${index}" title="Remove">&times;</button>
                </div>
            `);
        });

        // Handle remove
        list.find('.remove-file').on('click', function (e) {
            e.stopPropagation();
            const idx = $(this).data('index');
            selectedFiles.splice(idx, 1);
            renderFileList();
        });
    }

    // ---- FORM SUBMISSION ----
    $('#complaintForm').on('submit', function (e) {
        e.preventDefault();

        const title = $('#complaintTitle').val().trim();
        const description = $('#complaintDescription').val().trim();
        const category = $('#complaintCategory').val();

        // Validation
        if (!title || !description || !category) {
            showToast('Please fill in all required fields.', 'error');
            return;
        }

        if (title.length < 5) {
            showToast('Title must be at least 5 characters.', 'error');
            return;
        }

        if (description.length < 10) {
            showToast('Description must be at least 10 characters.', 'error');
            return;
        }

        // Build FormData (required for file upload)
        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        formData.append('category', category);

        // Append files
        selectedFiles.forEach(function (file) {
            formData.append('attachments', file);
        });

        const $btn = $(this).find('button[type="submit"]');
        const originalText = $btn.html();
        $btn.html('<span class="spinner-border spinner-border-sm me-2"></span>Submitting...').prop('disabled', true);

        $.ajax({
            url: '/api/tickets',
            method: 'POST',
            data: formData,
            processData: false,  // Important: don't process FormData
            contentType: false,  // Important: let browser set content-type with boundary
            xhrFields: { withCredentials: true },
            success: function (response) {
                if (response.success) {
                    showToast('Complaint submitted successfully!', 'success');
                    setTimeout(() => {
                        window.location.href = '/student-dashboard';
                    }, 1000);
                }
            },
            error: function (xhr) {
                const msg = xhr.responseJSON?.message || 'Failed to submit complaint. Please try again.';
                showToast(msg, 'error');
                $btn.html(originalText).prop('disabled', false);
            }
        });
    });

    // ---- LOGOUT ----
    $('#logoutBtn').on('click', function () {
        $.ajax({
            url: '/api/logout',
            method: 'POST',
            xhrFields: { withCredentials: true },
            success: function () {
                sessionStorage.clear();
                window.location.href = '/login';
            }
        });
    });

    // ---- UTILITY ----
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.appendChild(document.createTextNode(text));
        return div.innerHTML;
    }

    window.showToast = window.showToast || function (message, type) {
        const container = $('#toast-container');
        if (container.length === 0) {
            $('body').append('<div id="toast-container" class="toast-container"></div>');
        }
        const icons = { success: '✓', error: '✕', warning: '⚠' };
        const toast = $(`
            <div class="toast-custom ${type}">
                <span class="toast-icon">${icons[type] || '✓'}</span>
                <span class="toast-message">${message}</span>
                <button class="toast-close" onclick="$(this).parent().fadeOut(200, function(){ $(this).remove(); })">&times;</button>
            </div>
        `);
        $('#toast-container').append(toast);
        setTimeout(() => { toast.fadeOut(300, function () { $(this).remove(); }); }, 4000);
    };
});
