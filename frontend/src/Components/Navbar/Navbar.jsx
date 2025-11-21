import { Link } from 'react-router-dom';

import React, { useContext, useEffect, useRef, useState } from "react";
import './Navbar.css'
import logo from '../Assets/logo.png'
import cart_icon from '../Assets/cart_icon.png'
import nav_dropdown from '../Assets/nav_dropdown.png'
import { ShopContext } from '../../Context/ShopContext';
import { WishlistContext } from '../../Context/WishlistContext';

export const Navbar = () => {
  const [menu, setMenu] = useState('shop');
  const { getTotalCartItems } = useContext(ShopContext);
  const { count: wishlistCount } = useContext(WishlistContext);
  const menuRef = useRef();

  const dropdown_toggle = (e) => {
    if (menuRef.current) menuRef.current.classList.toggle('nav-menu-visible');
    e.target.classList.toggle('open');
  };

  // Load Google Translate script once
  useEffect(() => {
    if (window.__gt_script_loaded) return;
    window.googleTranslateElementInit = function () {
      const el = document.getElementById('google_translate_element');
      if (!el) return;
      if (el.childElementCount > 0) return; // already initialized
      if (window.google && window.google.translate) {
        new window.google.translate.TranslateElement({
          pageLanguage: 'en',
          includedLanguages:
            'en,hi,ta,te,ml,bn,gu,mr,pa,kn,ur,fr,de,es,it,pt,ru,zh-CN,ja,ko,ar',
          layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
          autoDisplay: false,
        }, 'google_translate_element');
      }
    };
    const existing = document.getElementById('google-translate-script');
    if (!existing) {
      const s = document.createElement('script');
      s.id = 'google-translate-script';
      s.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      s.async = true;
      document.body.appendChild(s);
    }
    window.__gt_script_loaded = true;
  }, []);

  return (
    <div className='navbar'>
      <div className='nav-logo'>
        <img src={logo} alt='' />
        <p>SHOPPER</p>
      </div>
      <img className='nav-dropdown' onClick={dropdown_toggle} src={nav_dropdown} alt='' />
      <ul ref={menuRef} className='nav-menu'>
        <li onClick={() => { setMenu('shop') }}>
          <Link style={{ textDecoration: 'none' }} to='/'>Shop</Link>
          {menu == 'shop' ? <hr /> : <></>}
        </li>
        <li onClick={() => { setMenu('mens') }}>
          <Link style={{ textDecoration: 'none' }} to='/mens'>Men</Link>
          {menu == 'mens' ? <hr /> : <></>}
        </li>
        <li onClick={() => { setMenu('womens') }}>
          <Link style={{ textDecoration: 'none' }} to='/womens'>Women</Link>
          {menu == 'womens' ? <hr /> : <></>}
        </li>
        <li onClick={() => { setMenu('kids') }}>
          <Link style={{ textDecoration: 'none' }} to='/kids'>Kids</Link>
          {menu == 'kids' ? <hr /> : <></>}
        </li>
      </ul>
      <div className='nav-login-cart'>
        <div id='google_translate_element' className='translate-box' style={{ marginRight: 12 }} />
        {localStorage.getItem('auth-token')
          ? <button onClick={() => { localStorage.removeItem('auth-token'); localStorage.removeItem('user-key'); window.location.replace('/') }}>Logout</button>
          : <Link to='/login'><button>Login</button></Link>}
        <Link to='/wishlist' className='nav-icon-btn' style={{ position: 'relative' }}>
          <span className='wishlist-heart'>♥</span>
          {wishlistCount > 0 && (
            <span className='nav-badge' style={{ position: 'absolute', top: -6, right: -6, background: '#ff6b6b', color: '#fff', borderRadius: 10, padding: '0 6px', fontSize: 12 }}>
              {wishlistCount}
            </span>
          )}
        </Link>
        <Link to='/cart'><img src={cart_icon} alt='' /></Link>
        <div className='nav-cart-count'>{getTotalCartItems()}</div>
      </div>
    </div>
  );
}
