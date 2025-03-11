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
let currentOrder = null;
let currentCategory = 'all';
let currentPriceSort = 'none';
let currentPriceRange = 11000;
const ITEMS_PER_PAGE = 10;
let pageState = {
  products: 1,
  bestSellers: 1,
  wishlist: 1,
  history: 1
};

const ADMIN_EMAIL = 'admin@buyzo.com';
const ADMIN_PASSWORD = 'admin123';
const COIN_VALUE = 5;
const ADMIN_DETAILS = {
  name: "BUYZO Admin",
  email: "admin@buyzo.com",
  address: "123, Anna Salai, Chennai, Tamil Nadu 600002",
  phone: "044-1234-5678"
};

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  let date = dateStr instanceof Date ? dateStr : (dateStr.toDate ? dateStr.toDate() : new Date(dateStr));
  if (isNaN(date.getTime())) return 'N/A';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year} ${date.toLocaleTimeString()}`;
}

function showSection(sectionId) {
  document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
  document.getElementById(sectionId).classList.add('active');
  if (sectionId === 'products') loadProducts();
  if (sectionId === 'home') loadBestSellers();
  if (sectionId === 'cart') loadCart();
  if (sectionId === 'wishlist') loadWishlist();
  if (sectionId === 'history') loadHistory();
  if (sectionId === 'wallet') loadWallet();
}

function toggleSidebar(forceClose = false) {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('active', !forceClose && !sidebar.classList.contains('active'));
}

document.addEventListener('DOMContentLoaded', () => {
  showSection('home');
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.add('active');
  setTimeout(() => sidebar.classList.remove('active'), 1500);
});

document.addEventListener('click', (e) => {
  const sidebar = document.getElementById('sidebar');
  const menuToggle = document.querySelector('.menu-toggle');
  const loginOptions = document.getElementById('loginOptions');
  const filterOptions = document.getElementById('filterOptions');
  
  if (!sidebar.contains(e.target) && !menuToggle.contains(e.target) && sidebar.classList.contains('active')) toggleSidebar(true);
  if (!loginOptions.contains(e.target) && !document.querySelector('.login-btn').contains(e.target) && loginOptions.classList.contains('active')) toggleLoginDropdown();
  if (!filterOptions.contains(e.target) && !document.querySelector('.filter-btn').contains(e.target) && filterOptions.classList.contains('active')) toggleFilterDropdown();
});

function showMessage(message, duration = 3000) {
  const messageBox = document.getElementById('messageBox');
  messageBox.innerHTML = messageBox.innerText = message; // Fixed typo from innerCUL
  messageBox.classList.add('show');
  setTimeout(() => messageBox.classList.remove('show'), duration);
}

function showBonusPopup() {
  document.getElementById('bonusPopup').style.display = 'flex';
}

function closeBonusPopup() {
  document.getElementById('bonusPopup').style.display = 'none';
}

function toggleFilterDropdown() {
  document.getElementById('filterOptions').classList.toggle('active');
}

function updatePriceRange() {
  const slider = document.getElementById('priceRange');
  const value = Math.round(slider.value / 100) * 100;
  currentPriceRange = value >= 11000 ? 11000 : value;
  document.getElementById('priceRangeValue').innerText = `100 - ${currentPriceRange === 11000 ? '10000+' : currentPriceRange}`;
  applyFilters();
}

function applyFilters() {
  currentCategory = document.getElementById('filterCategory').value;
  currentPriceSort = document.getElementById('filterPrice').value;
  pageState.products = 1;
  loadProducts();
}

function toggleLoginDropdown() {
  document.getElementById('loginOptions').classList.toggle('active');
}

function handleOrdersClick() {
  if (currentUser) showSection('history');
  else showMessage('Please login to view your orders!');
  toggleLoginDropdown();
}

function handleWishlistClick() {
  if (currentUser) showSection('wishlist');
  else showMessage('Please login to view your wishlist!');
  toggleLoginDropdown();
}

function handleWalletClick() {
  if (currentUser) showSection('wallet');
  else showMessage('Please login to view your wallet!');
  toggleLoginDropdown();
}

function handleCartClick() {
  if (currentUser) showSection('cart');
  else showMessage('Please login to view your cart!');
}

function showProfile() {
  if (!currentUser) {
    showMessage('Please login to view your profile!');
    showSection('login');
    return;
  }
  db.collection('users').doc(currentUser.uid).get()
    .then(doc => {
      const userData = doc.data();
      document.getElementById('profileName').innerText = userData.name || 'N/A';
      document.getElementById('profileEmail').innerText = currentUser.email || 'N/A';
      document.getElementById('profilePhone').innerText = userData.phone || 'N/A';
      document.getElementById('profileDob').innerText = formatDate(userData.dateOfBirth);
      document.getElementById('profileCoins').innerText = userData.buyzoCoins || 0;
      document.getElementById('profileModal').style.display = 'flex';
    });
}

function closeProfileModal() {
  document.getElementById('profileModal').style.display = 'none';
}

document.getElementById('registerForm').addEventListener('submit', e => {
  e.preventDefault();
  const email = document.getElementById('regEmail').value;
  const password = document.getElementById('regPassword').value;
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    showMessage('Admin credentials cannot be used for registration!');
    return;
  }
  const userData = {
    name: document.getElementById('regName').value,
    age: parseInt(document.getElementById('regAge').value),
    gender: document.getElementById('regGender').value,
    phone: document.getElementById('regPhone').value,
    dateOfBirth: document.getElementById('regDob').value,
    email: email,
    buyzoCoins: 10,
    cart: [],
    orderHistory: [],
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  auth.createUserWithEmailAndPassword(email, password)
    .then(cred => {
      currentUser = cred.user;
      return db.collection('users').doc(currentUser.uid).set(userData);
    })
    .then(() => {
      showMessage('Welcome to BUYZO! Registration successful!');
      showBonusPopup();
      updateProfileSection();
      updateWalletDisplay();
      showSection('home');
    })
    .catch(err => showMessage(err.message));
});

document.getElementById('loginForm').addEventListener('submit', e => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  auth.signInWithEmailAndPassword(email, password)
    .then(cred => {
      currentUser = cred.user;
      if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        showMessage('Admin login successful!');
        window.location.href = 'admin.html';
      } else {
        showMessage('Welcome back to BUYZO!');
        updateProfileSection();
        updateWalletDisplay();
        showSection('home');
      }
    })
    .catch(err => showMessage(err.message));
});

function updateProfileSection() {
  const profileSection = document.getElementById('profileSection');
  const loginMenuBtn = document.getElementById('loginMenuBtn');
  if (currentUser) {
    db.collection('users').doc(currentUser.uid).get()
      .then(doc => {
        profileSection.classList.add('active');
        loginMenuBtn.innerHTML = '<i class="fas fa-bars"></i> Menu';
      });
  } else {
    profileSection.classList.remove('active');
    loginMenuBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
  }
}

function updateCartCount() {
  const cartCountSpan = document.getElementById('cartCount');
  if (!currentUser) {
    cartCountSpan.innerText = '0';
    return;
  }
  db.collection('users').doc(currentUser.uid).collection('cart').get()
    .then(snapshot => {
      const totalItems = snapshot.docs.reduce((sum, doc) => sum + (doc.data().quantity || 0), 0);
      cartCountSpan.innerText = totalItems;
    });
}

function updateWalletDisplay() {
  if (!currentUser) return;
  db.collection('users').doc(currentUser.uid).get()
    .then(doc => {
      if (!doc.exists || !doc.data()) {
        document.getElementById('homeCoins').innerText = '0';
        document.getElementById('walletCoins').innerText = '0';
        document.getElementById('walletValue').innerText = '0';
        document.getElementById('paymentCoins').innerText = '0';
        document.getElementById('paymentCoinsValue').innerText = '0';
        return;
      }
      const coins = doc.data().buyzoCoins || 0;
      document.getElementById('homeCoins').innerText = coins;
      document.getElementById('walletCoins').innerText = coins;
      document.getElementById('walletValue').innerText = coins * COIN_VALUE;
      document.getElementById('paymentCoins').innerText = coins;
      document.getElementById('paymentCoinsValue').innerText = coins * COIN_VALUE;
    })
    .catch(err => {
      console.error("Error fetching wallet data:", err);
      document.getElementById('homeCoins').innerText = '0';
      document.getElementById('walletCoins').innerText = '0';
      document.getElementById('walletValue').innerText = '0';
      document.getElementById('paymentCoins').innerText = '0';
      document.getElementById('paymentCoinsValue').innerText = '0';
    });
}

function filterProducts(category) {
  currentCategory = category;
  pageState.products = 1;
  showSection('products');
}

function changePage(section, direction) {
  pageState[section] += direction;
  if (section === 'products') loadProducts();
  if (section === 'bestSellers') loadBestSellers();
  if (section === 'wishlist') loadWishlist();
  if (section === 'history') loadHistory();
}

function searchProducts() {
  const searchTerm = document.getElementById('searchBar').value.toLowerCase();
  loadProducts(searchTerm);
}

function loadProducts(searchTerm = '') {
  const productsListDiv = document.getElementById('productsList');
  const prevProductsBtn = document.getElementById('prevProducts');
  const nextProductsBtn = document.getElementById('nextProducts');
  
  productsListDiv.innerHTML = "Loading BUYZO products...";
  
  let query = db.collection('products').where('isActive', '==', true);
  if (currentCategory !== 'all') query = query.where('category', '==', currentCategory.toLowerCase());
  if (currentPriceSort !== 'none') query = query.orderBy('price', currentPriceSort === 'lowToHigh' ? 'asc' : 'desc');
  
  query.get().then(snapshot => {
    let allProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(prod => prod.price <= currentPriceRange);
    
    if (searchTerm) {
      allProducts = allProducts.filter(prod => prod.name.toLowerCase().includes(searchTerm));
    }
    
    const totalProductsPages = Math.ceil(allProducts.length / ITEMS_PER_PAGE);
    pageState.products = Math.max(1, Math.min(pageState.products, totalProductsPages));
    productsListDiv.innerHTML = "";
    const productsStart = (pageState.products - 1) * ITEMS_PER_PAGE;
    const productsToShow = allProducts.slice(productsStart, productsStart + ITEMS_PER_PAGE);
    productsToShow.forEach(prod => renderProduct(prod, productsListDiv));
    prevProductsBtn.style.display = pageState.products === 1 ? 'none' : 'inline-block';
    nextProductsBtn.style.display = pageState.products >= totalProductsPages ? 'none' : 'inline-block';
    
    if (allProducts.length === 0) {
      productsListDiv.innerHTML = "No products available on BUYZO.";
      prevProductsBtn.style.display = 'none';
      nextProductsBtn.style.display = 'none';
    }
  }).catch(err => {
    console.error("Error loading products:", err);
    productsListDiv.innerHTML = "Error loading products.";
  });
}

function loadBestSellers() {
  const bestSellersListDiv = document.getElementById('bestSellersList');
  const prevBestSellersBtn = document.getElementById('prevBestSellers');
  const nextBestSellersBtn = document.getElementById('nextBestSellers');
  
  bestSellersListDiv.innerHTML = "Loading best sellers...";
  
  db.collection('products')
    .where('isActive', '==', true)
    .orderBy('price', 'desc')
    .get()
    .then(snapshot => {
      let bestSellers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(prod => prod.price <= currentPriceRange);
      
      const totalBestSellersPages = Math.ceil(bestSellers.length / ITEMS_PER_PAGE);
      pageState.bestSellers = Math.max(1, Math.min(pageState.bestSellers, totalBestSellersPages));
      bestSellersListDiv.innerHTML = "";
      const bestSellersStart = (pageState.bestSellers - 1) * ITEMS_PER_PAGE;
      const bestSellersToShow = bestSellers.slice(bestSellersStart, bestSellersStart + ITEMS_PER_PAGE);
      bestSellersToShow.forEach(prod => renderProduct(prod, bestSellersListDiv));
      prevBestSellersBtn.style.display = pageState.bestSellers === 1 ? 'none' : 'inline-block';
      nextBestSellersBtn.style.display = pageState.bestSellers >= totalBestSellersPages ? 'none' : 'inline-block';
      
      if (bestSellers.length === 0) {
        bestSellersListDiv.innerHTML = "No best sellers available.";
        prevBestSellersBtn.style.display = 'none';
        nextBestSellersBtn.style.display = 'none';
      }
    }).catch(err => {
      console.error("Error loading best sellers:", err);
      bestSellersListDiv.innerHTML = "Error loading best sellers.";
    });
}

function getCartQuantity(productId) {
  return new Promise(resolve => {
    if (!currentUser) return resolve(0);
    db.collection('users').doc(currentUser.uid).collection('cart').where('productId', '==', productId).get()
      .then(snapshot => resolve(snapshot.empty ? 0 : snapshot.docs[0].data().quantity));
  });
}

function renderProduct(prod, container) {
  const productId = prod.id;
  const imageUrl = prod.imageURLs?.[0] || 'https://via.placeholder.com/200';
  const prodDiv = document.createElement('div');
  prodDiv.classList.add('product');
  if (prod.stock === 0) prodDiv.classList.add('sold-out');
  else if (prod.stock < 15) prodDiv.classList.add('low-stock');

  getCartQuantity(productId).then(cartQty => {
    const showQtyControl = cartQty > 0;
    prodDiv.innerHTML = `
      <img src="${imageUrl}" alt="${prod.name}" width="150" onerror="this.src='https://via.placeholder.com/200'">
      <h4>${prod.name}</h4>
      <p>₹${prod.price || 'N/A'} | Coins: ${prod.buyzoCoins || 0}</p>
      <p class="stock-status">${prod.stock === 0 ? 'Sold Out' : prod.stock < 15 ? 'Limited Stock!' : `Stock: ${prod.stock}`}</p>
      <div class="product-actions">
        <div class="quantity-control" id="qty-${productId}" style="display: ${showQtyControl ? 'flex' : 'none'}">
          <button onclick="updateProductQuantity('${productId}', ${cartQty - 1}, this.parentElement.parentElement.parentElement, event)"><i class="fas fa-minus"></i></button>
          <span>${cartQty || 0}</span>
          <button onclick="updateProductQuantity('${productId}', ${cartQty + 1}, this.parentElement.parentElement.parentElement, event)"><i class="fas fa-plus"></i></button>
        </div>
        <button class="cart-btn-icon" ${prod.stock === 0 || showQtyControl ? 'style="display:none"' : ''} onclick="addToCart('${productId}', '${prod.name}', this.parentElement, 1, event)"><i class="fas fa-cart-plus"></i><span class="tooltip">Add to Cart</span></button>
        <button class="wishlist-btn-icon" ${prod.stock === 0 || showQtyControl ? 'style="display:none"' : ''} onclick="addToWishlist('${productId}', '${prod.name}')"><i class="fas fa-heart"></i><span class="tooltip">Add to Wishlist</span></button>
      </div>
    `;
    container.appendChild(prodDiv);
  });
}

function updateProductQuantity(productId, newQty, productElement, event) {
  if (event) event.preventDefault(); // Make event optional
  if (!currentUser) {
    showMessage('Please login to update your cart!');
    showSection('login');
    return;
  }
  db.collection('products').doc(productId).get().then(doc => {
    const prod = doc.data();
    if (newQty > prod.stock) {
      showMessage(`Not enough stock available! Only ${prod.stock} left.`);
      return;
    }
    const cartRef = db.collection('users').doc(currentUser.uid).collection('cart');
    cartRef.where('productId', '==', productId).get().then(snapshot => {
      const qtyControl = productElement.querySelector('.quantity-control');
      const cartBtn = productElement.querySelector('.cart-btn-icon');
      const wishlistBtn = productElement.querySelector('.wishlist-btn-icon');
      if (snapshot.empty && newQty > 0) {
        addToCart(productId, prod.name, productElement, newQty, event);
      } else if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        if (newQty <= 0) {
          cartRef.doc(doc.id).delete().then(() => {
            qtyControl.style.display = 'none';
            cartBtn.style.display = 'inline-block';
            wishlistBtn.style.display = 'inline-block';
            productElement.querySelector('.quantity-control span').innerText = '0';
            updateCartCount();
            loadCart();
            loadProducts();
          });
        } else {
          cartRef.doc(doc.id).update({ quantity: newQty }).then(() => {
            qtyControl.querySelector('span').innerText = newQty;
            updateCartCount();
            loadCart();
            loadProducts();
          });
        }
      }
    });
  });
}

function addToCart(productId, name, actionContainer, qty = 1, event) {
  if (event) event.preventDefault(); // Make event optional
  if (!currentUser) {
    showMessage('Please login to add items to your cart!');
    showSection('login');
    return;
  }
  db.collection('products').doc(productId).get()
    .then(doc => {
      const prod = doc.data();
      if (prod.stock < qty) {
        showMessage(`Not enough stock available! Only ${prod.stock} left.`);
        return;
      }
      const price = prod.price || 0;
      const imageUrl = prod.imageURLs?.[0] || 'https://via.placeholder.com/200';
      const cartRef = db.collection('users').doc(currentUser.uid).collection('cart');
      cartRef.where('productId', '==', productId).get()
        .then(snapshot => {
          if (snapshot.empty) {
            cartRef.add({
              productId: productId,
              name: name,
              price: price,
              quantity: qty, // Now guaranteed to be a number
              imageUrl: imageUrl,
              addedAt: firebase.firestore.FieldValue.serverTimestamp()
            }).then(() => {
              showMessage(`${name} added to your BUYZO cart.`);
              const qtyControl = actionContainer.querySelector('.quantity-control');
              qtyControl.style.display = 'flex';
              qtyControl.querySelector('span').innerText = qty;
              actionContainer.querySelector('.cart-btn-icon').style.display = 'none';
              actionContainer.querySelector('.wishlist-btn-icon').style.display = 'none';
              updateCartCount();
              loadCart();
              loadProducts();
            });
          } else {
            const doc = snapshot.docs[0];
            const newQty = doc.data().quantity + qty;
            if (newQty > prod.stock) {
              showMessage(`Not enough stock available! Only ${prod.stock} left.`);
              return;
            }
            cartRef.doc(doc.id).update({ quantity: newQty }).then(() => {
              showMessage(`${name} quantity updated in your BUYZO cart.`);
              const qtyControl = actionContainer.querySelector('.quantity-control');
              qtyControl.style.display = 'flex';
              qtyControl.querySelector('span').innerText = newQty;
              updateCartCount();
              loadCart();
              loadProducts();
            });
          }
        });
    });
}

function loadCart() {
  const cartListDiv = document.getElementById('cartList');
  const cartTotalSpan = document.getElementById('cartTotal');
  if (!currentUser) {
    cartListDiv.innerHTML = "Please login to view your cart!";
    cartTotalSpan.innerText = '0';
    return;
  }
  cartListDiv.innerHTML = "";
  db.collection('users').doc(currentUser.uid).collection('cart').get()
    .then(snapshot => {
      if (snapshot.empty) {
        cartListDiv.innerHTML = "Your BUYZO cart is empty.";
        cartTotalSpan.innerText = '0';
        return;
      }
      let totalAmount = 0;
      snapshot.forEach(doc => {
        const item = doc.data();
        const totalPrice = item.price * item.quantity;
        totalAmount += totalPrice;
        const itemDiv = document.createElement('div');
        itemDiv.classList.add('cart-item');
        itemDiv.innerHTML = `
          <div class="item-details">
            <img src="${item.imageUrl || 'https://via.placeholder.com/200'}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/200'">
            <strong>${item.name}</strong>
          </div>
          <div class="item-quantity">
            <button onclick="updateCartQuantity('${doc.id}', ${item.quantity - 1}, event)"><i class="fas fa-minus"></i></button>
            <span>${item.quantity}</span>
            <button onclick="updateCartQuantity('${doc.id}', ${item.quantity + 1}, event)"><i class="fas fa-plus"></i></button>
          </div>
          <div class="item-total">
            <p>₹${totalPrice}</p>
          </div>
        `;
        cartListDiv.appendChild(itemDiv);
      });
      cartTotalSpan.innerText = totalAmount;
    });
}

function updateCartQuantity(docId, newQuantity, event) {
  if (event) event.preventDefault(); // Make event optional
  const cartRef = db.collection('users').doc(currentUser.uid).collection('cart').doc(docId);
  cartRef.get().then(doc => {
    const item = doc.data();
    return db.collection('products').doc(item.productId).get().then(prodDoc => {
      const prod = prodDoc.data();
      if (newQuantity > prod.stock) {
        showMessage(`Not enough stock available! Only ${prod.stock} left.`);
        return;
      }
      if (newQuantity <= 0) {
        cartRef.delete().then(() => {
          loadCart();
          updateCartCount();
          loadProducts();
        });
      } else {
        cartRef.update({ quantity: newQuantity }).then(() => {
          loadCart();
          updateCartCount();
          loadProducts();
        });
      }
    });
  });
}

function addToWishlist(productId, name) {
  if (!currentUser) {
    showMessage('Please login to add items to your wishlist!');
    showSection('login');
    return;
  }
  const wishlistRef = db.collection('wishlist').doc(`${currentUser.uid}_${productId}`);
  db.collection('products').doc(productId).get().then(prodDoc => {
    const prod = prodDoc.data();
    if (prod.stock === 0) {
      showMessage('Cannot add sold-out items to wishlist!');
      return;
    }
    const imageUrl = prod.imageURLs?.[0] || 'https://via.placeholder.com/200';
    wishlistRef.get().then(doc => {
      if (doc.exists) {
        showMessage(`${name} is already in your BUYZO wishlist!`);
      } else {
        wishlistRef.set({
          userId: currentUser.uid,
          productId: productId,
          name: name,
          price: prod.price,
          imageUrl: imageUrl,
          addedAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
          showMessage(`${name} added to your BUYZO wishlist.`);
          loadWishlist();
        });
      }
    });
  });
}

function loadWishlist() {
  const wishlistListDiv = document.getElementById('wishlistList');
  const prevWishlistBtn = document.getElementById('prevWishlist');
  const nextWishlistBtn = document.getElementById('nextWishlist');
  if (!currentUser) {
    wishlistListDiv.innerHTML = "Please login to view your wishlist!";
    prevWishlistBtn.style.display = 'none';
    nextWishlistBtn.style.display = 'none';
    return;
  }
  wishlistListDiv.innerHTML = "Loading your wishlist...";
  db.collection('wishlist').where('userId', '==', currentUser.uid).get()
    .then(snapshot => {
      const allWishlistItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const totalPages = Math.ceil(allWishlistItems.length / ITEMS_PER_PAGE);
      pageState.wishlist = Math.max(1, Math.min(pageState.wishlist, totalPages));
      wishlistListDiv.innerHTML = "";
      const start = (pageState.wishlist - 1) * ITEMS_PER_PAGE;
      const wishlistToShow = allWishlistItems.slice(start, start + ITEMS_PER_PAGE);
      wishlistToShow.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.classList.add('wishlist-item');
        itemDiv.innerHTML = `
          <img src="${item.imageUrl}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/200'">
          <h4>${item.name}</h4>
          <p>₹${item.price}</p>
          <button onclick="addToCart('${item.productId}', '${item.name}')"><i class="fas fa-cart-plus"></i><span class="tooltip">Add to Cart</span></button>
        `;
        wishlistListDiv.appendChild(itemDiv);
      });
      prevWishlistBtn.style.display = pageState.wishlist === 1 ? 'none' : 'inline-block';
      nextWishlistBtn.style.display = pageState.wishlist >= totalPages ? 'none' : 'inline-block';
      if (allWishlistItems.length === 0) {
        wishlistListDiv.innerHTML = "Your BUYZO wishlist is empty.";
        prevWishlistBtn.style.display = 'none';
        nextWishlistBtn.style.display = 'none';
      }
    });
}

function loadWallet() {
  if (!currentUser) return;
  updateWalletDisplay();
}

function placeOrder() {
  if (!currentUser) {
    showMessage('Please login to place an order!');
    showSection('login');
    return;
  }
  const userCartRef = db.collection('users').doc(currentUser.uid).collection('cart');
  userCartRef.get().then(snapshot => {
    if (snapshot.empty) {
      showMessage('Your BUYZO cart is empty!');
      return;
    }
    let cartItems = [];
    snapshot.forEach(doc => cartItems.push({ id: doc.id, ...doc.data() }));
    const variants = cartItems.map(item => ({
      productId: item.productId,
      quantity: item.quantity,
      price: item.price,
      name: item.name,
      imageUrl: item.imageUrl,
      buyzoCoins: item.buyzoCoins || 0
    }));
    const totalAmount = variants.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    db.collection('users').doc(currentUser.uid).get().then(doc => {
      const coins = doc.data().buyzoCoins || 0;
      currentOrder = { id: null, totalAmount, cartItems: snapshot, variants };
      document.getElementById('paymentAmount').innerText = totalAmount;
      document.getElementById('paymentCoins').innerText = coins;
      document.getElementById('paymentCoinsValue').innerText = coins * COIN_VALUE;
      document.getElementById('coinsToUse').max = coins;
      document.getElementById('paymentModal').style.display = 'flex';
    });
  });
}

function generateInvoice(orderId, userData, orderData) {
  const timestamp = formatDate(orderData.orderDate);
  const sanitizedContent = DOMPurify.sanitize(`
    <h3>From (Admin):</h3>
    <p><strong>Name:</strong> ${ADMIN_DETAILS.name}</p>
    <p><strong>Email:</strong> ${ADMIN_DETAILS.email}</p>
    <p><strong>Address:</strong> ${ADMIN_DETAILS.address}</p>
    <p><strong>Phone:</strong> ${ADMIN_DETAILS.phone}</p>
    <h3>To (Customer):</h3>
    <p><strong>Name:</strong> ${userData.name}</p>
    <p><strong>Email:</strong> ${currentUser.email}</p>
    <p><strong>Phone:</strong> ${userData.phone}</p>
    <p><strong>Date of Birth:</strong> ${formatDate(userData.dateOfBirth)}</p>
    <h3>Order Details:</h3>
    <p><strong>Order ID:</strong> ${orderId}</p>
    <p><strong>Timestamp:</strong> ${timestamp}</p>
    <p><strong>Payment Method:</strong> ${orderData.paymentMethod}</p>
    <p><strong>Coins Used:</strong> ${orderData.coinsUsed} (₹${orderData.coinsUsed * COIN_VALUE})</p>
    <h3>Products Purchased:</h3>
    <table>
      <thead>
        <tr>
          <th>Product Name</th>
          <th>Quantity</th>
          <th>Unit Price</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${orderData.items.map(item => `
          <tr>
            <td>${item.name}</td>
            <td>${item.quantity}</td>
            <td>₹${item.price}</td>
            <td>₹${item.price * item.quantity}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    <h3>Summary:</h3>
    <p><strong>Total Amount:</strong> ₹${orderData.totalAmount}</p>
    <p><strong>Amount Paid:</strong> ₹${orderData.amountPaid}</p>
  `);
  document.getElementById('invoiceContent').innerHTML = sanitizedContent;
  document.getElementById('invoiceModal').style.display = 'flex';
  db.collection('invoices').doc(orderId).set({
    userId: currentUser.uid,
    orderId: orderId,
    invoiceContent: sanitizedContent,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  });
}

function downloadInvoice() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const invoiceElement = document.getElementById('invoiceContent');
  const orderId = currentOrder ? currentOrder.id : 'unknown';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  html2canvas(invoiceElement, { scale: 2 }).then(canvas => {
    const imgData = canvas.toDataURL('image/png');
    const imgWidth = 190;
    const pageHeight = 295;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 10;
    doc.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight + 10;
      doc.addPage();
      doc.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }
    doc.save(`Invoice_${orderId}_${timestamp}.pdf`);
  }).catch(err => showMessage('Failed to download invoice. Please try again.'));
}

function closeInvoiceModal() {
  document.getElementById('invoiceModal').style.display = 'none';
}

function processPayment() {
  if (!currentOrder || !currentUser) return;
  const paymentMethod = document.getElementById('paymentMethod').value;
  const coinsToUse = parseInt(document.getElementById('coinsToUse').value) || 0;
  const transactionId = `TXN${Date.now()}`;
  db.collection('users').doc(currentUser.uid).get().then(userDoc => {
    const userData = userDoc.data();
    let totalAmount = currentOrder.totalAmount;
    const availableCoins = userData.buyzoCoins || 0;
    const coinsUsed = Math.min(coinsToUse, availableCoins, Math.ceil(totalAmount / COIN_VALUE));
    const amountReduced = coinsUsed * COIN_VALUE;
    totalAmount -= amountReduced;

    const orderData = {
      userId: currentUser.uid,
      items: currentOrder.variants,
      totalAmount: currentOrder.totalAmount,
      coinsUsed: coinsUsed,
      amountPaid: totalAmount,
      paymentMethod: paymentMethod,
      status: 'pending',
      paymentStatus: 'pending',
      orderDate: firebase.firestore.FieldValue.serverTimestamp()
    };

    db.collection('orders').add(orderData).then(orderRef => {
      currentOrder.id = orderRef.id;
      const stockUpdates = currentOrder.variants.map(item => {
        return db.collection('products').doc(item.productId).update({
          stock: firebase.firestore.FieldValue.increment(-item.quantity)
        });
      });

      const coinUpdates = currentOrder.variants.map(item => (item.buyzoCoins || 0) * item.quantity);
      const totalCoinsEarned = coinUpdates.reduce((sum, coins) => sum + coins, 0);

      Promise.all(stockUpdates).then(() => {
        db.collection('payments').add({
          userId: currentUser.uid,
          orderId: currentOrder.id,
          amount: totalAmount,
          paymentMethod: paymentMethod,
          transactionId: transactionId,
          coinsUsed: coinsUsed,
          status: 'completed',
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
          db.collection('orders').doc(currentOrder.id).update({
            status: 'confirmed',
            paymentStatus: 'paid'
          });
          const cartClearPromises = currentOrder.cartItems.docs.map(doc => doc.ref.delete());
          Promise.all(cartClearPromises).then(() => {
            db.collection('users').doc(currentUser.uid).update({
              orderHistory: firebase.firestore.FieldValue.arrayUnion(currentOrder.id),
              buyzoCoins: firebase.firestore.FieldValue.increment(-coinsUsed + totalCoinsEarned)
            }).then(() => {
              showMessage(`Order placed successfully! ${coinsUsed} Buyzo Coins used. You earned ${totalCoinsEarned} Buyzo Coins.`);
              closePaymentModal();
              generateInvoice(currentOrder.id, userData, orderData);
              loadCart();
              updateCartCount();
              updateWalletDisplay();
              loadHistory();
              loadProducts();
              currentOrder = null;
            });
          });
        });
      });
    });
  });
}

function closePaymentModal() {
  document.getElementById('paymentModal').style.display = 'none';
}

function loadHistory() {
  const historyListDiv = document.getElementById('historyList');
  const prevHistoryBtn = document.getElementById('prevHistory');
  const nextHistoryBtn = document.getElementById('nextHistory');
  if (!currentUser) {
    historyListDiv.innerHTML = "Please login to view your order history!";
    prevHistoryBtn.style.display = 'none';
    nextHistoryBtn.style.display = 'none';
    return;
  }
  historyListDiv.innerHTML = "Loading your order history...";
  db.collection('orders').where('userId', '==', currentUser.uid).get()
    .then(snapshot => {
      const allOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const totalPages = Math.ceil(allOrders.length / ITEMS_PER_PAGE);
      pageState.history = Math.max(1, Math.min(pageState.history, totalPages));
      historyListDiv.innerHTML = "";
      const start = (pageState.history - 1) * ITEMS_PER_PAGE;
      const ordersToShow = allOrders.slice(start, start + ITEMS_PER_PAGE);
      ordersToShow.forEach(order => {
        const orderDiv = document.createElement('div');
        orderDiv.classList.add('order-item');
        const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
        orderDiv.innerHTML = `
          <div class="order-summary" onclick="toggleOrderDetails('${order.id}')">
            <p><strong>Order #${order.id.slice(0, 8)}</strong> - ${formatDate(order.orderDate)}</p>
            <p>Total: ₹${order.totalAmount} (${totalItems} items)</p>
          </div>
          <div class="order-details" id="details-${order.id}" style="display: none;">
            <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>
            <p><strong>Coins Used:</strong> ${order.coinsUsed}</p>
            <p><strong>Amount Paid:</strong> ₹${order.amountPaid}</p>
            <h4>Items:</h4>
            <ul>
              ${order.items.map(item => `<li>${item.name} x${item.quantity} - ₹${item.price * item.quantity}</li>`).join('')}
            </ul>
            <button onclick="buyAgain('${order.id}')"><i class="fas fa-shopping-cart"></i> Buy Again</button>
            <button onclick="viewInvoice('${order.id}')"><i class="fas fa-file-invoice"></i> View Invoice</button>
          </div>
        `;
        historyListDiv.appendChild(orderDiv);
      });
      prevHistoryBtn.style.display = pageState.history === 1 ? 'none' : 'inline-block';
      nextHistoryBtn.style.display = pageState.history >= totalPages ? 'none' : 'inline-block';
      if (allOrders.length === 0) {
        historyListDiv.innerHTML = "No orders placed yet.";
        prevHistoryBtn.style.display = 'none';
        nextHistoryBtn.style.display = 'none';
      }
    });
}

function toggleOrderDetails(orderId) {
  const detailsDiv = document.getElementById(`details-${orderId}`);
  detailsDiv.style.display = detailsDiv.style.display === 'none' ? 'block' : 'none';
}

function viewInvoice(orderId) {
  db.collection('invoices').doc(orderId).get().then(doc => {
    if (doc.exists) {
      const invoiceData = doc.data();
      document.getElementById('invoiceContent').innerHTML = invoiceData.invoiceContent;
      document.getElementById('invoiceModal').style.display = 'flex';
      currentOrder = { id: orderId };
    } else {
      showMessage('Invoice not found!');
    }
  });
}

function buyAgain(orderId) {
  db.collection('orders').doc(orderId).get().then(doc => {
    const order = doc.data();
    const cartRef = db.collection('users').doc(currentUser.uid).collection('cart');
    const addPromises = order.items.map(item => {
      return db.collection('products').doc(item.productId).get().then(prodDoc => {
        const prod = prodDoc.data();
        if (prod.stock < item.quantity) {
          showMessage(`Not enough stock for ${item.name}! Only ${prod.stock} left.`);
          return Promise.resolve();
        }
        return cartRef.where('productId', '==', item.productId).get().then(snapshot => {
          if (snapshot.empty) {
            return cartRef.add({
              productId: item.productId,
              name: item.name,
              price: item.price,
              quantity: item.quantity,
              imageUrl: item.imageUrl,
              addedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
          } else {
            const doc = snapshot.docs[0];
            const newQty = doc.data().quantity + item.quantity;
            if (newQty > prod.stock) {
              showMessage(`Not enough stock for ${item.name}! Only ${prod.stock} left.`);
              return Promise.resolve();
            }
            return cartRef.doc(doc.id).update({ quantity: newQty });
          }
        });
      });
    });
    Promise.all(addPromises).then(() => {
      showMessage('Items added to cart from your previous order!');
      updateCartCount();
      loadCart();
      loadProducts();
    });
  });
}

function logout() {
  auth.signOut().then(() => {
    currentUser = null;
    showMessage('Logged out of BUYZO successfully.');
    updateProfileSection();
    showSection('home');
    loadCart();
    loadWishlist();
    loadHistory();
  });
}

document.getElementById('newsletterForm').addEventListener('submit', e => {
  e.preventDefault();
  showMessage('Subscribed successfully to BUYZO newsletter!');
  document.getElementById('newsletterForm').reset();
});

auth.onAuthStateChanged(user => {
  currentUser = user;
  updateProfileSection();
  updateCartCount();
  updateWalletDisplay();
  if (!user) {
    showSection('home');
    toggleSidebar();
  }
});