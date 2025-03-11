const firebaseConfig = {
  apiKey: "AIzaSyAfaoE08no4VFBRr19wrjneBSL4s4-yWic",
  authDomain: "e-commerce-website-12596.firebaseapp.com",
  projectId: "e-commerce-website-12596",
  storageBucket: "e-commerce-website-12596.firebasestorage.app",
  messagingSenderId: "680972991409",
  appId: "1:680972991409:web:c0c847949822dd29531b90",
  measurementId: "G-KGW6E9CLPK"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;
let currentAdminCategory = 'electronics';
let currentChart;

const ADMIN_EMAIL = 'admin@buyzo.com';
const ADMIN_PASSWORD = 'admin123';

// Report elements
const generateReportBtn = document.getElementById('generateReportBtn');
const reportDropdown = document.getElementById('reportDropdown');
const salesReportOpt = document.getElementById('salesReportOpt');
const customerReportOpt = document.getElementById('customerReportOpt');
const inventoryReportOpt = document.getElementById('inventoryReportOpt');
const reportModal = document.getElementById('reportModal');
const reportTitle = document.getElementById('reportTitle');
const reportChart = document.getElementById('reportChart').getContext('2d');
const reportTableContainer = document.getElementById('reportTableContainer');
const downloadPdfBtn = document.getElementById('downloadPdfBtn');
const closeModal = document.querySelector('.close');

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  return `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
}

function showMessage(message, duration = 3000) {
  const messageBox = document.getElementById('messageBox');
  messageBox.innerText = message;
  messageBox.classList.add('show');
  setTimeout(() => messageBox.classList.remove('show'), duration);
}

function updateProfileSection() {
  if (currentUser && currentUser.email === ADMIN_EMAIL) {
    db.collection('users').doc(currentUser.uid).get()
      .then(doc => {
        const userData = doc.data();
        document.getElementById('userName').innerText = userData?.name || 'BUYZO Admin';
      });
  }
}

function logout() {
  auth.signOut().then(() => {
    currentUser = null;
    showMessage('Logged out successfully.');
    window.location.href = 'index.html';
  });
}

function filterAdminProducts(category) {
  currentAdminCategory = category;
  loadAdminProducts();
}

function clearForm() {
  document.getElementById('crudForm').reset();
  document.getElementById('productActive').checked = false;
  updateSpecsFields();
}

function updateSpecsFields() {
  const category = document.getElementById('productCategory').value;
  const specFields = document.getElementById('specFields');
  specFields.innerHTML = '';
  let specs;
  switch (category) {
    case 'electronics':
      specs = `
        <label for="spec1"><i class="fas fa-battery-full"></i> Battery</label>
        <input type="text" id="spec1" placeholder="e.g., 5000mAh">
        <label for="spec2"><i class="fas fa-microchip"></i> Processor</label>
        <input type="text" id="spec2" placeholder="e.g., Snapdragon 8 Gen 1">
      `;
      break;
    case 'fashion':
      specs = `
        <label for="spec1"><i class="fas fa-ruler"></i> Size</label>
        <input type="text" id="spec1" placeholder="e.g., M, L, XL">
        <label for="spec2"><i class="fas fa-palette"></i> Color</label>
        <input type="text" id="spec2" placeholder="e.g., Blue">
      `;
      break;
    case 'furniture':
      specs = `
        <label for="spec1"><i class="fas fa-ruler-combined"></i> Dimensions</label>
        <input type="text" id="spec1" placeholder="e.g., 120x80x50 cm">
        <label for="spec2"><i class="fas fa-wood"></i> Material</label>
        <input type="text" id="spec2" placeholder="e.g., Wood">
      `;
      break;
    case 'sports':
      specs = `
        <label for="spec1"><i class="fas fa-weight"></i> Weight</label>
        <input type="text" id="spec1" placeholder="e.g., 500g">
        <label for="spec2"><i class="fas fa-dumbbell"></i> Type</label>
        <input type="text" id="spec2" placeholder="e.g., Running">
      `;
      break;
    case 'foodAndHealth':
      specs = `
        <label for="spec1"><i class="fas fa-weight-hanging"></i> Weight</label>
        <input type="text" id="spec1" placeholder="e.g., 1kg">
        <label for="spec2"><i class="fas fa-calendar-alt"></i> Expiry Date</label>
        <input type="text" id="spec2" placeholder="e.g., 12-12-2025">
      `;
      break;
    default:
      specs = '';
  }
  specFields.innerHTML = specs;
}

function loadAdminProducts() {
  const recentProductListDiv = document.getElementById('recentProductList');
  const productListDiv = document.getElementById('adminProductList');
  recentProductListDiv.innerHTML = "Loading recent products...";
  productListDiv.innerHTML = "Loading all products...";
  
  let query = db.collection('products');
  if (currentAdminCategory !== 'all') {
    query = query.where('category', '==', currentAdminCategory);
  }
  
  query.orderBy('createdAt', 'desc').limit(3).get()
    .then(snapshot => {
      recentProductListDiv.innerHTML = '';
      if (snapshot.empty) recentProductListDiv.innerHTML = "No recent products.";
      else snapshot.forEach(doc => renderProduct(doc, recentProductListDiv));
    });

  query.get()
    .then(snapshot => {
      productListDiv.innerHTML = '';
      if (snapshot.empty) productListDiv.innerHTML = "No products available.";
      else snapshot.forEach(doc => renderProduct(doc, productListDiv));
    });
}

function renderProduct(doc, container) {
  const prod = doc.data();
  const productId = doc.id;
  const prodDiv = document.createElement('div');
  prodDiv.classList.add('product');
  if (prod.stock < 15) prodDiv.classList.add('low-stock');
  prodDiv.innerHTML = `
    <img src="${prod.imageURLs?.[0] || 'https://via.placeholder.com/200'}" alt="${prod.name}" width="150" onerror="this.src='https://via.placeholder.com/200'">
    <h4>${prod.name}</h4>
    <p>Price: ₹${prod.price || 'N/A'} | Coins: ${prod.buyzoCoins || 0}</p>
    <p>Stock: ${prod.stock || 0} | Active: ${prod.isActive ? 'Yes' : 'No'}</p>
    <p>Updated: ${formatDate(prod.updatedAt?.toDate())}</p>
    <button onclick="editProduct('${productId}')"><i class="fas fa-edit"></i> Edit</button>
    <button onclick="deleteProduct('${productId}')"><i class="fas fa-trash"></i> Delete</button>
  `;
  if (prod.stock < 15) prodDiv.title = 'Low Stock';
  container.appendChild(prodDiv);
}

function editProduct(productId) {
  db.collection('products').doc(productId).get()
    .then(doc => {
      if (doc.exists) {
        const prod = doc.data();
        document.getElementById('productName').value = prod.name;
        document.getElementById('productCategory').value = prod.category;
        document.getElementById('productPrice').value = prod.price || '';
        document.getElementById('productBuyzoCoins').value = prod.buyzoCoins || 0;
        document.getElementById('productImage').value = prod.imageURLs?.[0] || '';
        document.getElementById('productStock').value = prod.stock || 0;
        document.getElementById('productActive').checked = prod.isActive || false;
        updateSpecsFields();
        document.getElementById('spec1').value = prod.specifications?.spec1 || '';
        document.getElementById('spec2').value = prod.specifications?.spec2 || '';
        document.getElementById('crudForm').onsubmit = (e) => updateProduct(e, productId);
      }
    });
}

function updateProduct(e, productId) {
  e.preventDefault();
  const buyzoCoins = parseInt(document.getElementById('productBuyzoCoins').value);
  const stock = parseInt(document.getElementById('productStock').value);
  if (isNaN(buyzoCoins) || buyzoCoins < 0 || isNaN(stock) || stock < 0) {
    showMessage('Invalid input!');
    return;
  }
  const productData = {
    name: document.getElementById('productName').value,
    category: document.getElementById('productCategory').value,
    price: parseFloat(document.getElementById('productPrice').value),
    buyzoCoins: buyzoCoins,
    imageURLs: [document.getElementById('productImage').value],
    specifications: {
      spec1: document.getElementById('spec1')?.value || '',
      spec2: document.getElementById('spec2')?.value || ''
    },
    isActive: document.getElementById('productActive').checked,
    stock: stock,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  db.collection('products').doc(productId).set(productData, { merge: true })
    .then(() => {
      showMessage('Product updated successfully!');
      loadAdminProducts();
      clearForm();
    })
    .catch(err => showMessage('Error: ' + err.message));
}

function deleteProduct(productId) {
  if (confirm('Are you sure you want to delete this product?')) {
    db.collection('products').doc(productId).delete()
      .then(() => {
        showMessage('Product deleted successfully!');
        loadAdminProducts();
      })
      .catch(err => showMessage('Error: ' + err.message));
  }
}

document.getElementById('crudForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const buyzoCoins = parseInt(document.getElementById('productBuyzoCoins').value);
  const stock = parseInt(document.getElementById('productStock').value);
  if (isNaN(buyzoCoins) || buyzoCoins < 0 || isNaN(stock) || stock < 0) {
    showMessage('Invalid input!');
    return;
  }
  const productData = {
    name: document.getElementById('productName').value,
    category: document.getElementById('productCategory').value,
    price: parseFloat(document.getElementById('productPrice').value),
    buyzoCoins: buyzoCoins,
    imageURLs: [document.getElementById('productImage').value],
    specifications: {
      spec1: document.getElementById('spec1')?.value || '',
      spec2: document.getElementById('spec2')?.value || ''
    },
    isActive: document.getElementById('productActive').checked,
    stock: stock,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  db.collection('products').add(productData)
    .then(() => {
      showMessage('Product added successfully!');
      loadAdminProducts();
      clearForm();
    })
    .catch(err => showMessage('Error: ' + err.message));
});

// Report Functions
generateReportBtn.addEventListener('click', () => reportDropdown.classList.toggle('active'));
document.addEventListener('click', (e) => {
  if (!generateReportBtn.contains(e.target) && !reportDropdown.contains(e.target)) {
    reportDropdown.classList.remove('active');
  }
});
closeModal.addEventListener('click', () => {
  reportModal.style.display = 'none';
  if (currentChart) currentChart.destroy();
});
document.getElementById('logoutBtn').addEventListener('click', logout);

async function fetchProducts() {
  const snapshot = await db.collection('products').get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function fetchOrders() {
  const snapshot = await db.collection('orders').get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

function renderPieChart(labels, data, title) {
  if (currentChart) currentChart.destroy();
  currentChart = new Chart(reportChart, {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF']
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { font: { size: 12 } } },
        title: { display: true, text: title, font: { size: 16 }, color: '#1E3A8A' }
      }
    }
  });
}

function renderTable(title, headers, rows, container) {
  const tableDiv = document.createElement('div');
  tableDiv.className = 'table-section';
  tableDiv.innerHTML = `<h3><i class="fas fa-table"></i> ${title}</h3>`;
  const table = document.createElement('table');
  table.className = 'report-table';
  table.innerHTML = `
    <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody>
  `;
  tableDiv.appendChild(table);
  container.appendChild(tableDiv);
}

async function generateSalesReport() {
  const orders = await fetchOrders();
  const products = await fetchProducts();
  const categories = ['electronics', 'fashion', 'furniture', 'sports', 'foodAndHealth'];

  // Sales by Category
  const salesByCategory = categories.map(cat => {
    return orders.reduce((sum, order) => {
      const items = order.items.filter(item => products.find(p => p.id === item.productId)?.category === cat);
      return sum + items.reduce((s, item) => s + (item.price * item.quantity), 0);
    }, 0);
  });
  renderPieChart(categories, salesByCategory, 'Sales by Category (₹)');

  // Top 10 Most Sold
  const productSales = {};
  orders.forEach(order => {
    order.items.forEach(item => {
      productSales[item.productId] = (productSales[item.productId] || 0) + item.quantity;
    });
  });
  const sortedSales = Object.entries(productSales).map(([id, qty]) => {
    const product = products.find(p => p.id === id);
    return { name: product?.name || 'Unknown', qty };
  }).sort((a, b) => b.qty - a.qty);
  const topSold = sortedSales.slice(0, 10).map(p => [p.name, p.qty]);
  const leastSold = sortedSales.slice(-10).reverse().map(p => [p.name, p.qty]);
  reportTableContainer.innerHTML = '';
  renderTable('Top 10 Most Sold Items', ['Product Name', 'Units Sold'], topSold, reportTableContainer);
  renderTable('Top 10 Least Sold Items', ['Product Name', 'Units Sold'], leastSold, reportTableContainer);

  reportTitle.innerHTML = '<i class="fas fa-dollar-sign"></i> Sales Report';
  reportModal.style.display = 'flex';
}

async function generateCustomerReport() {
  const orders = await fetchOrders();
  const products = await fetchProducts();
  const categories = ['electronics', 'fashion', 'furniture', 'sports', 'foodAndHealth'];

  // Customer Interest by Category
  const interestByCategory = categories.map(cat => {
    return orders.reduce((sum, order) => {
      const items = order.items.filter(item => products.find(p => p.id === item.productId)?.category === cat);
      return sum + items.reduce((s, item) => s + (item.price * item.quantity), 0);
    }, 0);
  });
  renderPieChart(categories, interestByCategory, 'Customer Spending by Category (₹)');

  // Top 10 Products by Revenue
  const productRevenue = {};
  orders.forEach(order => {
    order.items.forEach(item => {
      productRevenue[item.productId] = (productRevenue[item.productId] || 0) + (item.price * item.quantity);
    });
  });
  const sortedRevenue = Object.entries(productRevenue).map(([id, revenue]) => {
    const product = products.find(p => p.id === id);
    return { name: product?.name || 'Unknown', revenue };
  }).sort((a, b) => b.revenue - a.revenue);
  const topRevenue = sortedRevenue.slice(0, 10).map(p => [p.name, `₹${p.revenue.toFixed(2)}`]);
  reportTableContainer.innerHTML = '';
  renderTable('Top 10 Products by Revenue', ['Product Name', 'Revenue'], topRevenue, reportTableContainer);

  reportTitle.innerHTML = '<i class="fas fa-users"></i> Customer Report';
  reportModal.style.display = 'flex';
}

async function generateInventoryReport() {
  const products = await fetchProducts();

  // Available Stock Alphabetically
  const allStock = products.sort((a, b) => a.name.localeCompare(b.name)).map(p => [p.name, p.stock]);
  const sortedByStock = products.sort((a, b) => a.stock - b.stock);
  const leastStock = sortedByStock.slice(0, 10).map(p => [p.name, p.stock]);
  const mostStock = sortedByStock.slice(-10).reverse().map(p => [p.name, p.stock]);
  renderPieChart(['Low Stock (<15)', 'Sufficient Stock'], [
    products.filter(p => p.stock < 15).length,
    products.filter(p => p.stock >= 15).length
  ], 'Stock Status Overview');

  reportTableContainer.innerHTML = '';
  renderTable('Available Stock (Alphabetical)', ['Product Name', 'Stock'], allStock, reportTableContainer);
  renderTable('Top 10 Products with Least Stock', ['Product Name', 'Stock'], leastStock, reportTableContainer);
  renderTable('Top 10 Products with Most Stock', ['Product Name', 'Stock'], mostStock, reportTableContainer);

  reportTitle.innerHTML = '<i class="fas fa-warehouse"></i> Inventory Report';
  reportModal.style.display = 'flex';
}

downloadPdfBtn.addEventListener('click', () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const title = reportTitle.textContent;

  doc.setFontSize(16);
  doc.text(title, 10, 10);
  const chartImg = document.getElementById('reportChart').toDataURL('image/png');
  doc.addImage(chartImg, 'PNG', 10, 20, 90, 60);

  let yOffset = 90;
  reportTableContainer.querySelectorAll('.table-section').forEach((section, index) => {
    if (yOffset > 280) {
      doc.addPage();
      yOffset = 10;
    }
    doc.setFontSize(12);
    doc.text(section.querySelector('h3').textContent, 10, yOffset);
    yOffset += 10;
    doc.autoTable({
      startY: yOffset,
      head: [Array.from(section.querySelector('thead tr').children).map(cell => cell.textContent)],
      body: Array.from(section.querySelectorAll('tbody tr')).map(row => Array.from(row.children).map(cell => cell.textContent)),
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [30, 58, 138], textColor: 255 },
    });
    yOffset = doc.lastAutoTable.finalY + 10;
  });

  doc.save(`${title.replace(' ', '_')}_${timestamp}.pdf`);
});

salesReportOpt.addEventListener('click', (e) => { e.preventDefault(); generateSalesReport(); });
customerReportOpt.addEventListener('click', (e) => { e.preventDefault(); generateCustomerReport(); });
inventoryReportOpt.addEventListener('click', (e) => { e.preventDefault(); generateInventoryReport(); });

auth.onAuthStateChanged(user => {
  currentUser = user;
  updateProfileSection();
  if (user && user.email === ADMIN_EMAIL) {
    loadAdminProducts();
    updateSpecsFields();
  } else {
    window.location.href = 'index.html';
  }
});