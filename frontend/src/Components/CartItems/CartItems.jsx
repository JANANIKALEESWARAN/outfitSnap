import React, { useContext, useMemo, useState } from 'react'
import './CartItems.css'
import { ShopContext } from '../../Context/ShopContext'
import remove_icon from '../Assets/cart_cross_icon.png'
import { WishlistContext } from '../../Context/WishlistContext'
import { useNavigate } from 'react-router-dom'

export const CartItems = () => {
    const{ getTotalCartAmount,all_product,cartItems,removeFromCart}=useContext(ShopContext);
    const { toggleWishlist } = useContext(WishlistContext);
    const navigate = useNavigate();
    const [code, setCode] = useState('');
    const [applied, setApplied] = useState(null); // { code, type:'percent'|'flat'|'ship', value }
    const userKey = localStorage.getItem('user-key') || 'guest';

    const saveForLater = (id) => {
        toggleWishlist(id);
        removeFromCart(id);
    };

    const coupons = useMemo(() => ({
        'SAVE10': { code:'SAVE10', type:'percent', value:10, label:'10% off' },
        'FLAT50': { code:'FLAT50', type:'flat', value:50, minSubtotal:200, label:'$50 off orders $200+' },
        'FREESHIP': { code:'FREESHIP', type:'ship', value:0, label:'Free Shipping' },
    }), []);
    
    React.useEffect(() => {
        try {
            const raw = localStorage.getItem(`coupon:${userKey}`);
            if (raw) setApplied(JSON.parse(raw));
        } catch (e) {}
    }, [userKey]);

    React.useEffect(() => {
        try {
            if (applied) {
                localStorage.setItem(`coupon:${userKey}`, JSON.stringify(applied));
            } else {
                localStorage.removeItem(`coupon:${userKey}`);
            }
        } catch (e) {}
    }, [applied, userKey]);

    const subtotal = getTotalCartAmount();
    const shippingBase = subtotal > 0 ? 40 : 0; // base shipping
    const tax = subtotal > 0 ? +(subtotal * 0.05).toFixed(2) : 0; // 5% tax
    const discount = useMemo(()=>{
        if (!applied) return 0;
        if (applied.type === 'percent') return +(subtotal * (applied.value/100)).toFixed(2);
        if (applied.type === 'flat') return subtotal >= (applied.minSubtotal||0) ? Math.min(applied.value, subtotal) : 0;
        return 0;
    }, [applied, subtotal]);
    const shipping = applied && applied.type === 'ship' ? 0 : shippingBase;
    const total = Math.max(0, +(subtotal - discount + shipping + tax).toFixed(2));

    const applyCoupon = () => {
        const key = String(code || '').trim().toUpperCase();
        const c = coupons[key];
        if (!c) { alert('Invalid coupon code'); return; }
        if (c.minSubtotal && subtotal < c.minSubtotal){ alert(`Coupon requires minimum subtotal $${c.minSubtotal}`); return; }
        setApplied(c);
        setCode('');
    };
    const removeCoupon = () => setApplied(null);

    const goCheckout = () => {
        if (subtotal <= 0){ alert('Your cart is empty'); return; }
        navigate('/checkout', { state: { summary: { subtotal, discount, tax, shipping, total, coupon: applied } } });
    };
  return (
    <div className='cartitems'>
        <div className='cartitems-format-main'>
            <p>Products</p>
            <p>Title</p>
            <p>Price</p>
            <p>Quantity</p>
            <p>Total</p>
            <p>Actions</p>
        </div>
        <hr/>
        {all_product.map((e)=>{
            if(cartItems[e.id]>0)
                {
                return <div>
                    <div className='cartitems-format cartitems-format-main'>
                        <img src={e.image} alt="" className='carticon-product-icon'/>
                        <p>{e.name}</p>
                        <p>${e.new_price}</p>
                        <button className='cartitems-quantity'>{cartItems[e.id]}</button>
                        <p>${e.new_price*cartItems[e.id]}</p>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <button className='cartitems-save' onClick={() => saveForLater(e.id)} style={{ padding: '6px 10px' }}>
                            Save for later
                          </button>
                          <img className='cartitems-remove-icon' src={remove_icon}onClick={()=>{removeFromCart(e.id)}} alt=""/>
                        </div>
                    </div>
                    <hr/>
                </div>
                }
                return null;
        })}
        <div className='cartitems-down'>
            <div className='cartitems-total'>
                <h1>Cart Totals</h1>
                <div>
                    <div className='cartitems-total-item'>
                        <p>Subtotal</p>
                        <p>${ subtotal.toFixed(2)}</p>
                    </div>
                    <hr/>
                    <div className='cartitems-total-item'>
                        <p>Tax (5%)</p>
                        <p>${ tax.toFixed(2) }</p>
                    </div>
                    <hr/>
                    <div className='cartitems-total-item'>
                        <p>Shipping</p>
                        <p>{shipping === 0 ? 'Free' : `$${shipping.toFixed(2)}`}</p>
                    </div>
                    <hr/>
                    <div className='cartitems-total-item'>
                        <p>Discount {applied ? `(${applied.label})` : ''}</p>
                        <p>-${ discount.toFixed(2) }</p>
                    </div>
                    <hr/>
                    <div className='cartitems-total-item'>
                        <h3>Total</h3>
                        <h3>${ total.toFixed(2) }</h3>
                    </div>
                    <button onClick={goCheckout}>PROCEED TO CHECKOUT</button>
                </div>
                <div className='cartitems-promocode'>
                    <p>If you have a promo code, enter it here</p>
                    <div className='cartitems-promobox'>
                        <input type='text' value={code} onChange={e=>setCode(e.target.value)} placeholder='promo code'/>
                        {applied ? (
                          <button onClick={removeCoupon}>Remove</button>
                        ) : (
                          <button onClick={applyCoupon}>Apply</button>
                        )}
                    </div>
                    <div style={{ fontSize: 12, color: '#777', marginTop: 6 }}>
                      Try: SAVE10, FLAT50 (min $200), FREESHIP
                    </div>
                </div>
            </div>
        </div>
    </div>
  )
}