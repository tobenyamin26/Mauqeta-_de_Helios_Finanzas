// app.js - Modularized and enhanced logic for Helios Finanzas

// Currency formatter
const formatCurrency = (amount) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);

// Load data from localStorage
let data = JSON.parse(localStorage.getItem('heliosData')) || {
  salario: 800000,
  gastosFijos: 400000,
  metaAhorro: 100000,
  expenses: [] // [{name: 'Comida', amount: 50000}]
};

// DOM elements
const elements = {
  salario: document.getElementById('salario'),
  gastos: document.getElementById('gastos'),
  meta: document.getElementById('meta'),
  disponible: document.getElementById('disponible'),
  tasa: document.getElementById('tasa'),
  meses: document.getElementById('meses'),
  darkToggle: document.getElementById('darkToggle'),
  expenseList: document.getElementById('expenseList'),
  addExpenseBtn: document.getElementById('addExpenseBtn'),
  expenseName: document.getElementById('expenseName'),
  expenseAmount: document.getElementById('expenseAmount')
};

// Charts
let ahorroChart, gastosChart, comparacionChart;

// Init on load
document.addEventListener('DOMContentLoaded', initApp);

function initApp() {
  // Load data
  elements.salario.value = data.salario;
  elements.gastos.value = data.gastosFijos;
  elements.meta.value = data.metaAhorro;
  renderExpenses();
  
  // Init charts
  initCharts();
  
// Update display - now shows graphs immediately
  actualizarDatos();
  renderProjections();
  
  // Event listeners
  document.getElementById('updateBtn').addEventListener('click', handleUpdate);
  if (elements.darkToggle) elements.darkToggle.addEventListener('click', toggleDarkMode);
  if (elements.addExpenseBtn) elements.addExpenseBtn.addEventListener('click', addExpense);
  
  // Auto-save on input change
  [elements.salario, elements.gastos, elements.meta].forEach(el => {
    el.addEventListener('input', saveData);
  });
}

function initCharts() {
  // Defaults for initial display
  const salarioDefault = 800000;
  const gastosDefault = 400000;
  const disponibleDefault = salarioDefault - gastosDefault;
  const proyeccionDefault = Array(6).fill().map((_, i) => disponibleDefault * (i + 1));

  const ctxAhorro = document.getElementById('ahorroChart').getContext('2d');
  ahorroChart = new Chart(ctxAhorro, {
    type: 'line',
    data: { labels: ['Ene','Feb','Mar','Abr','May','Jun'], datasets: [{ label: 'Proyección Ahorro', data: proyeccionDefault, borderColor: '#047857', backgroundColor: 'rgba(16,185,129,0.2)', fill: true, tension: 0.4 }] },
    options: { responsive: true, plugins: { legend: { position: 'top' }, tooltip: { callbacks: { label: ctx => formatCurrency(ctx.parsed.y) } } } }
  });

  const ctxGastos = document.getElementById('gastosChart').getContext('2d');
  gastosChart = new Chart(ctxGastos, {
    type: 'doughnut',
    data: { labels: ['Arriendo','Comida','Transporte','Otros'], datasets: [{ data: [gastosDefault * 0.5, 0, 0, gastosDefault * 0.5], backgroundColor: ['#10b981','#047857','#065f46','#6ee7b7'] }] },
    options: { responsive: true, plugins: { tooltip: { callbacks: { label: ctx => `${ctx.label}: ${formatCurrency(ctx.parsed)}` } } } }
  });

  const ctxComparacion = document.getElementById('comparacionChart').getContext('2d');
  comparacionChart = new Chart(ctxComparacion, {
    type: 'bar',
    data: { labels: ['Ingresos','Gastos Totales'], datasets: [{ data: [salarioDefault, gastosDefault], backgroundColor: ['#10b981','#ef4444'] }] },
    options: { responsive: true, plugins: { tooltip: { callbacks: { label: ctx => formatCurrency(ctx.parsed.y) } } } }
  });
}

function actualizarDatos() {
  const salario = parseFloat(elements.salario.value) || 0;
  const gastosFijos = parseFloat(elements.gastos.value) || 0;
  const gastosVariables = data.expenses.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);
  const gastosTotal = gastosFijos + gastosVariables;
  const disponible = Math.max(0, salario - gastosTotal);
  const tasaAhorro = salario > 0 ? ((disponible / salario) * 100).toFixed(1) : 0;
  const meses = data.metaAhorro > 0 ? Math.ceil(data.metaAhorro / Math.max(disponible, 1)) : 0;

  // Update dashboard
  elements.disponible.textContent = `Disponible Mensual: ${formatCurrency(disponible)}`;
  elements.tasa.textContent = `Tasa de Ahorro: ${tasaAhorro}%`;
  elements.meses.textContent = `Tiempo para Meta: ${meses} meses`;

  // Update charts
  const proyeccion = Array(6).fill().map((_, i) => disponible * (i + 1));
  ahorroChart.data.datasets[0].data = proyeccion;
  ahorroChart.update('none');

  const cats = ['Arriendo', 'Comida', 'Transporte', 'Otros'];
  gastosChart.data.datasets[0].data = [gastosFijos * 0.5, gastosVariables * 0.4, gastosVariables * 0.3, gastosTotal * 0.2];
  gastosChart.data.labels = cats;
  gastosChart.update('none');

  comparacionChart.data.datasets[0].data = [salario, gastosTotal];
  comparacionChart.update('none');
}

function handleUpdate(e) {
  e.preventDefault();
  if (validateInputs()) {
    actualizarDatos();
    saveData();
  } else {
    showToast('Por favor ingresa valores válidos', 'error');
  }
}

function validateInputs() {
  return elements.salario.value > 0 && elements.gastos.value >= 0 && elements.meta.value >= 0;
}

function saveData() {
  data.salario = parseFloat(elements.salario.value) || 0;
  data.gastosFijos = parseFloat(elements.gastos.value) || 0;
  data.metaAhorro = parseFloat(elements.meta.value) || 0;
  localStorage.setItem('heliosData', JSON.stringify(data));
}

function renderExpenses() {
  if (!elements.expenseList) return;
  elements.expenseList.innerHTML = data.expenses.map((exp, i) => `
    <div class="expense-item">
      <span>${exp.name}: ${formatCurrency(exp.amount)}</span>
      <button onclick="removeExpense(${i})" aria-label="Eliminar ${exp.name}">🗑️</button>
    </div>
  `).join('');
  actualizarDatos(); // Re-calc
}

function addExpense() {
  const name = elements.expenseName.value.trim();
  const amount = parseFloat(elements.expenseAmount.value);
  if (name && amount > 0) {
    data.expenses.push({ name, amount });
    elements.expenseName.value = '';
    elements.expenseAmount.value = '';
    renderExpenses();
    saveData();
  }
}

function removeExpense(index) {
  data.expenses.splice(index, 1);
  renderExpenses();
  saveData();
}

function toggleDarkMode() {
  document.body.classList.toggle('dark-mode');
  const isDark = document.body.classList.contains('dark-mode');
  localStorage.setItem('darkMode', isDark);
  elements.darkToggle.textContent = isDark ? '☀️' : '🌙';
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type} show`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function renderProjections() {
  const tableBody = document.querySelector('#projectionTable tbody');
  if (!tableBody) return;
  
  const salario = parseFloat(elements.salario.value) || 0;
  const gastosFijos = parseFloat(elements.gastos.value) || 0;
  const gastosVariables = data.expenses.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);
  const gastosTotal = gastosFijos + gastosVariables;
  const disponible = Math.max(1, salario - gastosTotal);
  
  tableBody.innerHTML = Array(12).fill().map((_, i) => {
    const acumulado = disponible * (i + 1);
    return `<tr><td>Mes ${i+1}</td><td>${formatCurrency(acumulado)}</td></tr>`;
  }).join('');
}

// Load dark mode
if (localStorage.getItem('darkMode') === 'true') {
  document.body.classList.add('dark-mode');
  document.getElementById('darkToggle').textContent = '☀️';
}

