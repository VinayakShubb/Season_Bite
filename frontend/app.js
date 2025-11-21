let userId = null, tableId = null, orderId = null;
let order = [];
let loggedIn = false;

/* ============================
   AUTHENTICATION
============================ */
function showSignup() {
  document.getElementById("loginBox").style.display = "none";
  document.getElementById("signupBox").style.display = "block";
}
function showLogin() {
  document.getElementById("signupBox").style.display = "none";
  document.getElementById("loginBox").style.display = "block";
}
function openAuthBox() {
  document.getElementById("authContainer").style.display = "flex";
}
function closeAuthBox() {
  document.getElementById("authContainer").style.display = "none";
}

function handleSignup() {
  let name = document.getElementById("signupName").value;
  let phone = document.getElementById("signupPhone").value;
  let password = document.getElementById("signupPassword").value;
  if (!name || !phone || !password) {
    alert("All fields required");
    return;
  }
  fetch("http://localhost:5000/register", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({name, phone, password})
  }).then(r=>r.json()).then(data=>{
    alert(data.message);
    showLogin();
  });
}

function handleLogin() {
  let phone = document.getElementById("loginPhone").value;
  let password = document.getElementById("loginPassword").value;
  fetch("http://localhost:5000/login", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({phone, password})
  }).then(r=>r.json()).then(data=>{
    if(data.success){
      userId = data.user.CUSTOMER_ID;
      loggedIn = true;
      document.getElementById("authContainer").style.display="none";
      document.getElementById("loginBtn").textContent = "Profile";
      document.getElementById("loginBtn").onclick = openProfile;
      alert("Welcome, " + data.user.NAME + "!");
    } else {
      alert("Invalid login!");
    }
  });
}

/* ============================
   TABLE RESERVATION
============================ */
document.getElementById("bookTableBtn").onclick = function() {
  if (!loggedIn) { 
    alert("Please login first!");
    openAuthBox();
    return;
  }
  fetch("http://localhost:5000/tables/available").then(r=>r.json())
  .then(tables=>{
    let sel=document.getElementById("resTable");
    sel.innerHTML='<option value="">Select a Table</option>';
    if(tables.length === 0){
      sel.innerHTML='<option value="">No tables available</option>';
    } else {
      tables.forEach(t=>{
        sel.innerHTML += `<option value="${t.TABLE_ID}">Table ${t.TABLE_ID} - ${t.CAPACITY} seats</option>`;
      });
    }
  });
  document.getElementById("reservationSection").style.display="block";
  document.getElementById("menuPopup").style.display="none";
  document.getElementById("orderSection").style.display="none";
  document.getElementById("paymentSection").style.display="none";
};

document.getElementById("confirmReservation").onclick = function(){
  const date=document.getElementById("resDate").value;
  const time=document.getElementById("resTime").value;
  const datetime=`${date} ${time}`;
  tableId=document.getElementById("resTable").value;
  if(!tableId){ alert("Select a table"); return; }

  fetch("http://localhost:5000/reserve", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body:JSON.stringify({tableid:tableId, customerid:userId, datetime})
  }).then(r=>r.json()).then(d=>{
    alert(d.message);
    document.getElementById("reservationSection").style.display="none";
    document.getElementById("menuPopup").style.display="block";
  });
};

/* ============================
   MENU & ORDER
============================ */
document.getElementById("menuBtn").onclick = function() {
  fetch("http://localhost:5000/menu").then(r=>r.json())
  .then(items=>{
    let m=document.getElementById("menuItems");
    m.innerHTML="";
    items.forEach(d=>{
      let qty=0;
      m.innerHTML += `
      <div class="menu-item-row">
        <span class="menu-name">${d.DISH_NAME}</span>
        <span class="menu-price">₹${d.PRICE}</span>
        <div class="menu-qty-controls">
          <button class="qty-btn" onclick="changeQty(${d.MENU_ITEM_ID}, -1, ${d.PRICE})">-</button>
          <input type="text" id="qty_${d.MENU_ITEM_ID}" class="qty-input" value="${qty}" readonly>
          <button class="qty-btn" onclick="changeQty(${d.MENU_ITEM_ID}, 1, ${d.PRICE})">+</button>
        </div>
      </div>`;
    });
  });
  document.getElementById("menuPopup").style.display="block";
};


function changeQty(id, delta, price) {
  let input = document.getElementById(`qty_${id}`);
  let val = parseInt(input.value) || 0;
  let newVal = val + delta;
  if(newVal < 0) newVal = 0;
  input.value = newVal;
  let idx = order.findIndex(o => o.menu_item_id === id);
  if(idx !== -1 && newVal === 0) order.splice(idx, 1);
  else if(idx !== -1) order[idx].quantity = newVal;
  else if(newVal > 0) order.push({ menu_item_id:id, quantity:newVal, price:price });
  updateOrderSection();
}

function updateOrderSection() {
  let os=document.getElementById("orderSummary");
  let total=0;
  os.innerHTML="";
  order.forEach(o=>{
    os.innerHTML += `<p>${o.quantity}x Item ${o.menu_item_id} - ₹${o.price*o.quantity}</p>`;
    total += o.price*o.quantity;
  });
  os.innerHTML += `<hr><b>Total: ₹${total}</b>`;
  document.getElementById("payAmount").value=total;
}

function proceedToOrder(){
  if(order.length === 0){ alert("Select at least one dish."); return; }
  document.getElementById("orderSection").style.display="block";
  document.getElementById("menuPopup").style.display="none";
}

/* ============================
   PAYMENT & RECEIPT
============================ */
function payNow(){
  if(order.length === 0){ alert("No items selected!"); return; }

  fetch("http://localhost:5000/order", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body:JSON.stringify({customer_id:userId, table_id:tableId, items:order})
  }).then(r=>r.json()).then(data=>{
    orderId = data.order_id;
    document.getElementById("paymentSection").style.display="block";
    document.getElementById("orderSection").style.display="none";
  });
}

function confirmPay(){
  const amt=document.getElementById("payAmount").value;
  const method=document.getElementById("payMethod").value;
  if(!amt || amt<=0){ alert("Invalid amount"); return; }
  if(!method){ alert("Select a payment method"); return; }

  fetch("http://localhost:5000/payment", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body:JSON.stringify({order_id:orderId, amount:amt, method})
  }).then(r=>r.json()).then(res=>{
    if(res.success){
      showReceipt(orderId);
    }
  });
}

function showReceipt(orderId){
  fetch(`http://localhost:5000/receipt/${orderId}`).then(r=>r.json()).then(data=>{
    let details=data.details.map(d=>`<li>${d.QUANTITY}x ${d.DISH_NAME} - ₹${d.PRICE*d.QUANTITY}</li>`).join('');
    const html=`<div class='receipt-card'>
      <h3>Order Receipt</h3>
      <p><b>Table:</b> ${data.details[0].TABLE_ID}</p>
      <ul>${details}</ul>
      <p><b>Total:</b> ₹${data.total}</p>
      <button onclick="closeReceipt()">Close</button>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
  });
}

function closeReceipt(){
  const el=document.querySelector('.receipt-card');
  if(el) el.remove();
}

/* ============================
   USER PROFILE SECTION
============================ */
function openProfile() {
  fetch(`http://localhost:5000/profile/${userId}`).then(r=>r.json()).then(data=>{
    let container=document.getElementById("profileDetails");
    container.innerHTML="";
    if(data.length === 0){
      container.innerHTML="<p>No bookings found.</p>";
    } else {
      data.forEach(o=>{
        container.innerHTML += `
          <div>
            <p><b>Order ID:</b> ${o.ORDER_ID}</p>
            <p><b>Table:</b> ${o.TABLE_ID}</p>
            <p><b>Date:</b> ${new Date(o.ORDER_DATE).toLocaleString()}</p>
            <p><b>Status:</b> ${o.STATUS}</p>
          </div>`;
      });
    }
    document.getElementById("profileSection").style.display="block";
  });
}
function closeProfile() {
  document.getElementById("profileSection").style.display="none";
}

/* ============================
   UTILITIES
============================ */
function closeMenu() {
  document.getElementById("menuPopup").style.display="none";
}
