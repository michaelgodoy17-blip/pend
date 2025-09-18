
    const DEFAULT_BOARD = { Fazer: [], Fazendo: [], Feito: [] };
    const STORAGE_KEY = 'kanbanData_v1';
    let board = loadFromStorage();
    const boardEl = document.getElementById('board');

    function nowStr() { const d = new Date(); return d.toLocaleString(); }

    function render() {
      for (const colEl of boardEl.querySelectorAll('.column')) {
        const name = colEl.dataset.column;
        const scroll = colEl.querySelector('[data-col-scroll]');
        scroll.innerHTML = '';

        if (board[name].length === 0) {
          // Mostrar empty state se não houver tarefas
          const emptyState = document.createElement('div');
          emptyState.className = 'empty-state';

          if (name === 'Fazer') {
            emptyState.innerHTML = `<i class="fas fa-inbox"></i><p>Nenhuma tarefa</p>`;
          } else if (name === 'Fazendo') {
            emptyState.innerHTML = `<i class="fas fa-tools"></i><p>Nenhuma tarefa em andamento</p>`;
          } else {
            emptyState.innerHTML = `<i class="fas fa-trophy"></i><p>Nenhuma tarefa concluída</p>`;
          }

          scroll.appendChild(emptyState);
        } else {
          // Renderizar tarefas
          board[name].forEach((task, idx) => {
            const card = document.createElement('article');
            card.className = 'card' + (task.prioridade ? ' priority' : '');
            card.draggable = true;
            card.dataset.col = name;
            card.dataset.idx = idx;
            card.innerHTML = `
              <div class="text">${escapeHtml(task.texto)}</div>
              <div class="meta">
                <div><span class="flag" title="${task.prioridade ? 'Remover prioridade' : 'Marcar como prioridade'}">${task.prioridade ? '🚩' : '⚑'}</span></div>
                <div class="card-date">
                  <small>Criada: ${task.data_criacao}</small>
                  <small>Modificada: ${task.data_modificacao}</small>
                </div>
              </div>
            `;
            card.querySelector('.flag').addEventListener('click', (e) => { e.stopPropagation(); togglePriority(name, idx); });
            card.addEventListener('dblclick', () => openDetails(name, idx));
            card.addEventListener('contextmenu', (e) => openContextMenu(e, name, idx));
            card.addEventListener('dragstart', dragStart);
            card.addEventListener('dragend', dragEnd);
            scroll.appendChild(card);
          });
        }

        const countEl = colEl.querySelector('.col-count');
        countEl.textContent = `${board[name].length} tarefa${board[name].length === 1 ? '' : 's'}`;
      }

      document.querySelectorAll('.col-scroll').forEach(el => {
        el.removeEventListener('dragover', dragOver);
        el.removeEventListener('drop', drop);
        el.addEventListener('dragover', dragOver);
        el.addEventListener('drop', drop);
      });

      saveToStorage();
    }

    let dragData = null;
    function dragStart(e) {
      dragData = { fromCol: e.currentTarget.dataset.col, idx: Number(e.currentTarget.dataset.idx) };
      e.dataTransfer.setData('text/plain', '');
      e.currentTarget.style.opacity = '0.5';
    }

    function dragEnd(e) {
      e.currentTarget.style.opacity = '';
      dragData = null;
    }

    function dragOver(e) {
      e.preventDefault();
    }

    function drop(e) {
      e.preventDefault();
      if (!dragData) return;
      const toCol = e.currentTarget.closest('.column').dataset.column;
      moveTask(dragData.fromCol, toCol, dragData.idx);
      dragData = null;
    }

    const contextMenu = document.getElementById('contextMenu');
    window.addEventListener('click', () => hideContextMenu());

    function openContextMenu(e, col, idx) {
      e.preventDefault();
      e.stopPropagation();
      buildContextItems(col, idx);
      contextMenu.style.left = e.pageX + 'px';
      contextMenu.style.top = e.pageY + 'px';
      contextMenu.style.display = 'block';
    }

    function hideContextMenu() {
      contextMenu.style.display = 'none';
    }

    function buildContextItems(col, idx) {
      const possible = ['Fazer', 'Fazendo', 'Feito'];
      contextMenu.innerHTML = '';

      possible.forEach(target => {
        if (target !== col) {
          const btn = document.createElement('button');
          btn.innerHTML = `<i class="fas fa-arrow-right"></i> Mover para ${target}`;
          btn.onclick = () => { moveTask(col, target, idx); hideContextMenu(); };
          contextMenu.appendChild(btn);
        }
      });

      const detailsBtn = document.createElement('button');
      detailsBtn.innerHTML = '<i class="fas fa-info-circle"></i> Detalhes';
      detailsBtn.onclick = () => { openDetails(col, idx); hideContextMenu(); };
      contextMenu.appendChild(detailsBtn);

      const delBtn = document.createElement('button');
      delBtn.innerHTML = '<i class="fas fa-trash"></i> Remover';
      delBtn.onclick = () => { if (confirm('Remover a tarefa?')) removeTask(col, idx); hideContextMenu(); };
      contextMenu.appendChild(delBtn);
    }

    function addTask(text) {
      const ts = nowStr();
      board['Fazer'].push({ texto: text, data_criacao: ts, data_modificacao: ts, prioridade: false });
      render();
    }

    function moveTask(from, to, idx) {
      const t = board[from].splice(idx, 1)[0];
      t.data_modificacao = nowStr();
      board[to].push(t);
      render();
    }

    function removeTask(col, idx) {
      board[col].splice(idx, 1);
      render();
    }

    function togglePriority(col, idx) {
      board[col][idx].prioridade = !board[col][idx].prioridade;
      board[col][idx].data_modificacao = nowStr();
      render();
    }

    const modalBackdrop = document.getElementById('modalBackdrop');
    const modalText = document.getElementById('modalText');
    const modalStatus = document.getElementById('modalStatus');
    const modalCreated = document.getElementById('modalCreated');
    const modalModified = document.getElementById('modalModified');
    const modalPriority = document.getElementById('modalPriority');
    let modalContext = null;

    function openDetails(col, idx) {
      modalContext = { col, idx };
      const t = board[col][idx];
      document.querySelector('.modal-title').textContent = 'Detalhes da Tarefa';
      modalText.value = t.texto;
      modalStatus.textContent = col;
      modalCreated.textContent = t.data_criacao;
      modalModified.textContent = t.data_modificacao;
      modalPriority.checked = t.prioridade;
      modalBackdrop.style.display = 'flex';
      modalText.focus();
    }

    function closeModal() {
      modalBackdrop.style.display = 'none';
      modalContext = null;
    }

    document.getElementById('closeModal').addEventListener('click', closeModal);
    document.getElementById('saveDetails').addEventListener('click', () => {
      if (!modalContext) return;
      const { col, idx } = modalContext;
      board[col][idx].texto = modalText.value.trim();
      board[col][idx].prioridade = modalPriority.checked;
      board[col][idx].data_modificacao = nowStr();
      render();
      closeModal();
    });

    // Botão excluir do modal
    document.getElementById('deleteTask').addEventListener('click', () => {
      if (!modalContext) return;
      const { col, idx } = modalContext;
      if (confirm('Tem certeza que deseja remover esta tarefa?')) {
        removeTask(col, idx);
        closeModal();
      }
    });

    modalBackdrop.addEventListener('click', (e) => {
      if (e.target === modalBackdrop) closeModal();
    });

    // Fechar modal com ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modalBackdrop.style.display === 'flex') {
        closeModal();
      }
    });

    function saveToStorage() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(board));
    }

    function loadFromStorage() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(DEFAULT_BOARD));
      } catch (e) {
        return JSON.parse(JSON.stringify(DEFAULT_BOARD));
      }
    }

    document.getElementById('addBtn').addEventListener('click', () => {
      const txt = document.getElementById('taskInput').value.trim();
      if (!txt) return alert('A tarefa não pode estar vazia.');
      addTask(txt);
      document.getElementById('taskInput').value = '';
      document.getElementById('taskInput').focus();
    });

    document.getElementById('taskInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        document.getElementById('addBtn').click();
      }
    });

    document.getElementById('clearBtn').addEventListener('click', () => {
      document.getElementById('taskInput').value = '';
      document.getElementById('taskInput').focus();
    });

    document.getElementById('exportBtn').addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(board, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'tarefas-kanban.json';
      a.click();
      URL.revokeObjectURL(url);
    });

    document.getElementById('importBtn').addEventListener('click', () => document.getElementById('fileInput').click());
    document.getElementById('fileInput').addEventListener('change', (e) => {
      const f = e.target.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        try {
          const parsed = JSON.parse(r.result);
          if (parsed.Fazer && parsed.Fazendo && parsed.Feito) {
            board = parsed;
            render();
            alert('Importação concluída.');
          } else alert('Arquivo inválido');
        } catch (err) {
          alert('Erro ao importar: ' + err.message);
        }
      };
      r.readAsText(f);
    });

    function escapeHtml(s) {
      return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
    }

    render();

    window.addEventListener('keydown', (e) => {
      const active = document.activeElement;
      if (e.key === 'Delete' && active && active.classList && active.classList.contains('card')) {
        const col = active.dataset.col;
        const idx = Number(active.dataset.idx);
        if (confirm('Remover a tarefa?')) removeTask(col, idx);
      }
    });

    document.addEventListener('click', (e) => {
      const card = e.target.closest('.card');
      if (card) {
        document.querySelectorAll('.card').forEach(c => c.tabIndex = '-1');
        card.tabIndex = 0;
        card.focus();
      }
    }, true);