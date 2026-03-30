// ============================================
// Admin Dashboard Module
// Full complaint management with status updates
// ============================================

$(document).ready(function () {
    // ---- CHECK AUTH ----
    let currentUser = null;

    function initDashboard() {
        $.ajax({
            url: '/api/me',
            method: 'GET',
            xhrFields: { withCredentials: true },
            success: function (response) {
                if (response.success && response.data) {
                    if (response.data.role !== 'admin') {
                        window.location.href = '/student-dashboard';
                        return;
                    }
                    currentUser = response.data;
                    $('#userName').text(currentUser.name);
                    $('#userAvatar').text(currentUser.name.charAt(0).toUpperCase());
                    loadStats();
                    loadTickets();
                } else {
                    window.location.href = '/login';
                }
            },
            error: function () {
                window.location.href = '/login';
            }
        });
    }

    // ---- LOAD STATISTICS ----
    function loadStats() {
        $.ajax({
            url: '/api/tickets/stats',
            method: 'GET',
            xhrFields: { withCredentials: true },
            success: function (response) {
                if (response.success) {
                    const s = response.data;
                    $('#statTotal').text(s.total || 0);
                    $('#statOpen').text(s.open_count || 0);
                    $('#statProgress').text(s.in_progress_count || 0);
                    $('#statResolved').text(s.resolved_count || 0);
                    $('#statHighPriority').text(s.high_priority_count || 0);
                    $('#statHostel').text(s.hostel_count || 0);
                    $('#statWifi').text(s.wifi_count || 0);
                    $('#statClassroom').text(s.classroom_count || 0);
                    $('#statMess').text(s.mess_count || 0);
                }
            }
        });
    }

    // ---- LOAD TICKETS ----
    function loadTickets() {
        const filters = {
            status: $('#filterStatus').val() || '',
            category: $('#filterCategory').val() || '',
            priority: $('#filterPriority').val() || '',
            search: $('#searchInput').val() || ''
        };

        const params = new URLSearchParams();
        if (filters.status) params.append('status', filters.status);
        if (filters.category) params.append('category', filters.category);
        if (filters.priority) params.append('priority', filters.priority);
        if (filters.search) params.append('search', filters.search);

        $.ajax({
            url: `/api/tickets?${params.toString()}`,
            method: 'GET',
            xhrFields: { withCredentials: true },
            beforeSend: function () {
                $('#ticketsTableBody').html(`
                    <tr><td colspan="8">
                        <div class="loading-overlay"><div class="spinner-glow"></div></div>
                    </td></tr>
                `);
            },
            success: function (response) {
                if (response.success) {
                    renderTickets(response.data);
                    $('#ticketCount').text(response.count || 0);
                }
            },
            error: function () {
                showToast('Failed to load complaints.', 'error');
            }
        });
    }

    // ---- RENDER TICKETS TABLE ----
    function renderTickets(tickets) {
        const tbody = $('#ticketsTableBody');
        tbody.empty();

        if (!tickets || tickets.length === 0) {
            tbody.html(`
                <tr><td colspan="8">
                    <div class="empty-state">
                        <div class="empty-icon">📋</div>
                        <h3>No complaints found</h3>
                        <p>No complaints match your current filters.</p>
                    </div>
                </td></tr>
            `);
            return;
        }

        tickets.forEach(function (ticket, index) {
            const statusClass = ticket.status.toLowerCase().replace(' ', '-');
            const categoryClass = ticket.category.toLowerCase();
            const priorityClass = ticket.priority.toLowerCase();
            const date = new Date(ticket.created_at).toLocaleDateString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric'
            });

            const row = `
                <tr class="fade-in-up stagger-${Math.min(index + 1, 8)}">
                    <td><span class="ticket-id">#${String(ticket.id).padStart(4, '0')}</span></td>
                    <td><span class="ticket-title">${escapeHtml(ticket.title)}</span></td>
                    <td>
                        <div style="font-size: 0.85rem;">${escapeHtml(ticket.user_name)}</div>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(ticket.user_email)}</div>
                    </td>
                    <td><span class="badge-category badge-${categoryClass}">${ticket.category}</span></td>
                    <td><span class="badge-priority badge-${priorityClass}">${ticket.priority}</span></td>
                    <td><span class="badge-status badge-${statusClass}">${ticket.status}</span></td>
                    <td><span style="color: var(--text-muted); font-size: 0.82rem;">${date}</span></td>
                    <td>
                        <div style="display: flex; gap: 0.35rem;">
                            <button class="action-btn action-btn-view" title="View Details" data-id="${ticket.id}">👁</button>
                            <button class="action-btn action-btn-edit" title="Update Status" data-id="${ticket.id}">✏️</button>
                            <button class="action-btn action-btn-delete" title="Delete" data-id="${ticket.id}">🗑</button>
                        </div>
                    </td>
                </tr>
            `;
            tbody.append(row);
        });

        // Bind action buttons
        tbody.find('.action-btn-view').on('click', function (e) {
            e.stopPropagation();
            viewTicketDetail($(this).data('id'));
        });

        tbody.find('.action-btn-edit').on('click', function (e) {
            e.stopPropagation();
            openUpdateModal($(this).data('id'));
        });

        tbody.find('.action-btn-delete').on('click', function (e) {
            e.stopPropagation();
            deleteTicket($(this).data('id'));
        });
    }

    // ---- VIEW TICKET DETAIL ----
    function viewTicketDetail(ticketId) {
        $.ajax({
            url: `/api/tickets/${ticketId}`,
            method: 'GET',
            xhrFields: { withCredentials: true },
            success: function (response) {
                if (response.success) {
                    const t = response.data;
                    const statusClass = t.status.toLowerCase().replace(' ', '-');
                    const categoryClass = t.category.toLowerCase();
                    const priorityClass = t.priority.toLowerCase();
                    const createdDate = new Date(t.created_at).toLocaleDateString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    });
                    const updatedDate = new Date(t.updated_at).toLocaleDateString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    });

                    let attachmentsHtml = '';
                    if (t.attachments && t.attachments.length > 0) {
                        attachmentsHtml = '<div class="mt-3"><h6 style="color: var(--text-secondary); margin-bottom: 0.75rem;">📎 Attachments</h6><div class="attachment-list">';
                        t.attachments.forEach(function (att) {
                            attachmentsHtml += `<a href="${att.file_path}" target="_blank" class="attachment-item">📄 ${escapeHtml(att.original_name)}</a>`;
                        });
                        attachmentsHtml += '</div></div>';
                    }

                    const detailHtml = `
                        <div class="ticket-detail-header">
                            <div>
                                <h5 style="font-weight: 700;">${escapeHtml(t.title)}</h5>
                                <div class="ticket-meta">
                                    <span class="ticket-id">#${String(t.id).padStart(4, '0')}</span>
                                    <span class="badge-status badge-${statusClass}">${t.status}</span>
                                    <span class="badge-category badge-${categoryClass}">${t.category}</span>
                                    <span class="badge-priority badge-${priorityClass}">${t.priority}</span>
                                </div>
                            </div>
                        </div>
                        <div style="display: flex; gap: 1.5rem; margin-bottom: 1rem; flex-wrap: wrap; font-size: 0.85rem; color: var(--text-muted);">
                            <span>👤 ${escapeHtml(t.user_name)} (${escapeHtml(t.user_email)})</span>
                            <span>📅 Created: ${createdDate}</span>
                            <span>🔄 Updated: ${updatedDate}</span>
                        </div>
                        <div class="ticket-description">${escapeHtml(t.description)}</div>
                        ${attachmentsHtml}
                    `;

                    $('#ticketDetailBody').html(detailHtml);
                    const modal = new bootstrap.Modal(document.getElementById('ticketDetailModal'));
                    modal.show();
                }
            },
            error: function () {
                showToast('Failed to load complaint details.', 'error');
            }
        });
    }

    // ---- OPEN UPDATE MODAL ----
    function openUpdateModal(ticketId) {
        $.ajax({
            url: `/api/tickets/${ticketId}`,
            method: 'GET',
            xhrFields: { withCredentials: true },
            success: function (response) {
                if (response.success) {
                    const t = response.data;
                    $('#updateTicketId').val(t.id);
                    $('#updateTicketTitle').text(`#${String(t.id).padStart(4, '0')} - ${t.title}`);
                    $('#updateStatus').val(t.status);
                    $('#updatePriority').val(t.priority);

                    const modal = new bootstrap.Modal(document.getElementById('updateTicketModal'));
                    modal.show();
                }
            },
            error: function () {
                showToast('Failed to load complaint data.', 'error');
            }
        });
    }

    // ---- SUBMIT STATUS UPDATE ----
    $('#updateTicketForm').on('submit', function (e) {
        e.preventDefault();

        const ticketId = $('#updateTicketId').val();
        const status = $('#updateStatus').val();
        const priority = $('#updatePriority').val();

        const $btn = $(this).find('button[type="submit"]');
        const originalText = $btn.html();
        $btn.html('<span class="spinner-border spinner-border-sm me-2"></span>Updating...').prop('disabled', true);

        $.ajax({
            url: `/api/tickets/${ticketId}/status`,
            method: 'PUT',
            contentType: 'application/json',
            data: JSON.stringify({ status, priority }),
            xhrFields: { withCredentials: true },
            success: function (response) {
                if (response.success) {
                    showToast('Complaint updated successfully!', 'success');
                    bootstrap.Modal.getInstance(document.getElementById('updateTicketModal')).hide();
                    loadStats();
                    loadTickets();
                }
            },
            error: function (xhr) {
                const msg = xhr.responseJSON?.message || 'Failed to update complaint.';
                showToast(msg, 'error');
            },
            complete: function () {
                $btn.html(originalText).prop('disabled', false);
            }
        });
    });

    // ---- DELETE TICKET ----
    function deleteTicket(ticketId) {
        if (!confirm('Are you sure you want to delete this complaint? This action cannot be undone.')) {
            return;
        }

        $.ajax({
            url: `/api/tickets/${ticketId}`,
            method: 'DELETE',
            xhrFields: { withCredentials: true },
            success: function (response) {
                if (response.success) {
                    showToast('Complaint deleted successfully.', 'success');
                    loadStats();
                    loadTickets();
                }
            },
            error: function (xhr) {
                const msg = xhr.responseJSON?.message || 'Failed to delete complaint.';
                showToast(msg, 'error');
            }
        });
    }

    // ---- FILTER HANDLERS ----
    $('#filterStatus, #filterCategory, #filterPriority').on('change', function () {
        loadTickets();
    });

    let searchTimeout;
    $('#searchInput').on('input', function () {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(loadTickets, 300);
    });

    $('#clearFilters').on('click', function () {
        $('#filterStatus').val('');
        $('#filterCategory').val('');
        $('#filterPriority').val('');
        $('#searchInput').val('');
        loadTickets();
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

    // ---- INIT ----
    initDashboard();
});
