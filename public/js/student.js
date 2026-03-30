// ============================================
// Student Dashboard Module
// Loads stats, tickets, handles filters/search
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
                    currentUser = response.data;
                    // Update UI with user info
                    $('#userName').text(currentUser.name);
                    $('#userAvatar').text(currentUser.name.charAt(0).toUpperCase());
                    // Load dashboard data
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
                }
            }
        });
    }

    // ---- LOAD TICKETS ----
    function loadTickets() {
        const filters = {
            status: $('#filterStatus').val() || '',
            category: $('#filterCategory').val() || '',
            search: $('#searchInput').val() || ''
        };

        // Build query string
        const params = new URLSearchParams();
        if (filters.status) params.append('status', filters.status);
        if (filters.category) params.append('category', filters.category);
        if (filters.search) params.append('search', filters.search);

        $.ajax({
            url: `/api/tickets?${params.toString()}`,
            method: 'GET',
            xhrFields: { withCredentials: true },
            beforeSend: function () {
                $('#ticketsTableBody').html(`
                    <tr><td colspan="6">
                        <div class="loading-overlay"><div class="spinner-glow"></div></div>
                    </td></tr>
                `);
            },
            success: function (response) {
                if (response.success) {
                    renderTickets(response.data);
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
                <tr><td colspan="6">
                    <div class="empty-state">
                        <div class="empty-icon">📋</div>
                        <h3>No complaints found</h3>
                        <p>You haven't filed any complaints yet. Click "New Complaint" to get started.</p>
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
                <tr class="fade-in-up stagger-${Math.min(index + 1, 8)}" data-ticket-id="${ticket.id}">
                    <td>
                        <span class="ticket-id">#${String(ticket.id).padStart(4, '0')}</span>
                    </td>
                    <td>
                        <span class="ticket-title">${escapeHtml(ticket.title)}</span>
                    </td>
                    <td>
                        <span class="badge-category badge-${categoryClass}">${ticket.category}</span>
                    </td>
                    <td>
                        <span class="badge-priority badge-${priorityClass}">${ticket.priority}</span>
                    </td>
                    <td>
                        <span class="badge-status badge-${statusClass}">${ticket.status}</span>
                    </td>
                    <td>
                        <span style="color: var(--text-muted); font-size: 0.85rem;">${date}</span>
                    </td>
                </tr>
            `;
            tbody.append(row);
        });

        // Click row to view details
        tbody.find('tr[data-ticket-id]').on('click', function () {
            const ticketId = $(this).data('ticket-id');
            viewTicketDetail(ticketId);
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
                    const date = new Date(t.created_at).toLocaleDateString('en-IN', {
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
                            <span style="color: var(--text-muted); font-size: 0.85rem;">Filed: ${date}</span>
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

    // ---- FILTER HANDLERS ----
    $('#filterStatus, #filterCategory').on('change', function () {
        loadTickets();
    });

    // Debounced search
    let searchTimeout;
    $('#searchInput').on('input', function () {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(loadTickets, 300);
    });

    // Clear filters
    $('#clearFilters').on('click', function () {
        $('#filterStatus').val('');
        $('#filterCategory').val('');
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

    // Make showToast available globally
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
