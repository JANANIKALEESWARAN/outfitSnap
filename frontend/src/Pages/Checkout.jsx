import React, { useContext, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ShopContext } from '../Context/ShopContext';
import './CSS/Checkout.css';

export const Checkout = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { all_product, cartItems, getTotalCartAmount } = useContext(ShopContext);
  const [placing, setPlacing] = useState(false);

  // Build a cart line-items list
  const items = useMemo(() => {
    return all_product.filter(p => cartItems[p.id] > 0).map(p => ({
      id: p.id,
      name: p.name,
      qty: cartItems[p.id],
      price: p.new_price,
      image: p.image,
      lineTotal: +(p.new_price * cartItems[p.id]).toFixed(2),
    }));
  }, [all_product, cartItems]);

  const fallbackSummary = useMemo(() => ({
    subtotal: getTotalCartAmount(),
    discount: 0,
    tax: +(getTotalCartAmount() * 0.05).toFixed(2),
    shipping: getTotalCartAmount() > 0 ? 40 : 0,
    total: +(getTotalCartAmount() * 1.05 + (getTotalCartAmount() > 0 ? 40 : 0)).toFixed(2),
    coupon: null,
  }), [getTotalCartAmount]);

  const summary = state?.summary || fallbackSummary;

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    zip: '',
    payment: 'cod',
  });

  const onChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const placeOrder = () => {
    if (!items.length) { alert('Your cart is empty'); return; }
    if (!form.name || !form.address || !form.city || !form.zip) { alert('Please complete shipping details'); return; }
    setPlacing(true);
    // Mock placing order
    setTimeout(() => {
      setPlacing(false);
      alert('Order placed! (mock)');
      navigate('/');
    }, 600);
  };

  return (
    <div className="checkout">
      <div className="checkout-grid">
        <div className="checkout-left card">
          <h2 className="title">Checkout</h2>
          <div className="form-grid">
            <input className="input" name="name" value={form.name} onChange={onChange} placeholder="Full name" />
            <input className="input" name="email" value={form.email} onChange={onChange} placeholder="Email (optional)" />
            <input className="input" name="phone" value={form.phone} onChange={onChange} placeholder="Phone (optional)" />
            <input className="input" name="address" value={form.address} onChange={onChange} placeholder="Address" />
            <div className="row">
              <input className="input" name="city" value={form.city} onChange={onChange} placeholder="City" />
              <input className="input" name="zip" value={form.zip} onChange={onChange} placeholder="ZIP" />
            </div>
            <div className="row">
              <label className="label">Payment</label>
              <select className="select" name="payment" value={form.payment} onChange={onChange}>
                <option value="cod">Cash on Delivery</option>
                <option value="card">Card (mock)</option>
                <option value="upi">UPI (mock)</option>
              </select>
            </div>
          </div>

          <h3 className="subtitle">Items</h3>
          <div className="items">
            {items.map(it => (
              <div key={it.id} className="item-line">
                <img src={it.image} alt={it.name} className="item-img" />
                <div className="item-meta">
                  <div className="item-name">{it.name}</div>
                  <div className="item-qty">Qty: {it.qty}</div>
                </div>
                <div className="item-total">${it.lineTotal.toFixed(2)}</div>
              </div>
            ))}
            {!items.length && (
              <div className="muted">No items in cart.</div>
            )}
          </div>
        </div>

        <div className="checkout-right card">
          <h3 className="title-small">Order Summary</h3>
          <div className="summary">
            <div className="row-space">
              <span>Subtotal</span>
              <span>${summary.subtotal.toFixed(2)}</span>
            </div>
            <div className="row-space">
              <span>Tax</span>
              <span>${summary.tax.toFixed(2)}</span>
            </div>
            <div className="row-space">
              <span>Shipping</span>
              <span>{summary.shipping === 0 ? 'Free' : `$${summary.shipping.toFixed(2)}`}</span>
            </div>
            <div className="row-space">
              <span>Discount {summary.coupon ? `(${summary.coupon.label})` : ''}</span>
              <span>- ${summary.discount.toFixed(2)}</span>
            </div>
            <hr />
            <div className="row-space total">
              <span>Total</span>
              <span>${summary.total.toFixed(2)}</span>
            </div>
            <button className="btn btn-primary" onClick={placeOrder} disabled={placing}>
              {placing ? 'Placing Order…' : 'Place Order'}
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/cart')}>
              Back to Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
