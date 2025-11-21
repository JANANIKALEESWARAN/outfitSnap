import React, { useContext } from 'react'
import './ProductDisplay.css'
import star_icon from '../Assets/star_icon.png'
import star_dull_icon from '../Assets/star_dull_icon.png'
import { ShopContext } from '../../Context/ShopContext'
import { VirtualTryOn } from '../VirtualTryOn/VirtualTryOn'
import { WishlistContext } from '../../Context/WishlistContext'

export const ProductDisplay = (props) => {
    const{product}=props;
    const{addToCart}=useContext(ShopContext);
    const { isWishlisted, toggleWishlist } = useContext(WishlistContext);

    const isLoggedIn = localStorage.getItem("auth-token");

    const handleAddToCart = () => {
        if (isLoggedIn) {
            addToCart(product.id);
        } else {
            alert("Please login to add items to cart.");
        }
    };
    const wished = isWishlisted(product.id);

  const inferMaskUrl = (url) => {
    if (!url) return undefined;
    const q = url.split('?')[0];
    const dot = q.lastIndexOf('.');
    if (dot === -1) return `${url}_mask`;
    return q.slice(0, dot) + '_mask' + q.slice(dot);
  };

  return (
    <div className='productdisplay'>
        <div className='productdisplay-left'>
            <div className='productdisplay-img-list'>
                <img src={product.image} alt=""/>
                <img src={product.image} alt=""/>
                <img src={product.image} alt=""/>
                <img src={product.image} alt=""/>
            </div>
            <div className='productdisplay-img'>
                <img className='productdisplay-main-img' src={product.image}alt=""/>
            </div>
        </div>
        <div className='productdisplay-right'>
            <h1>{product.name}</h1>
            <div className='productdisplay-right-star'>
                <img src={star_icon}alt=""/>
                <img src={star_icon}alt=""/>
                <img src={star_icon}alt=""/>
                <img src={star_icon}alt=""/>
                <img src={star_dull_icon}alt=""/>
                <p>(122)</p>
            </div>
            <div className='productdisplay-right-prices'>
                <div className='productdisplay-right-price-old'>${product.old_price}</div>
                <div className='productdisplay-right-price-new'>${product.new_price}</div>
            </div>
            <div className='productdisplay-right-description'>
                A lightweight,usually knitted, pullover shirt,close-fitting and with a round neckline and short sleeves,worn as an undershirt or outer garment.
            </div>
            <div className='productdisplay-right-size'>
                <h1>Select Size</h1>
                <div className='productdisplay-right-sizes'>
                    <div>S</div>
                    <div>M</div>
                    <div>L</div>
                    <div>XL</div>
                    <div>XXL</div>
                </div>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', margin: '12px 0' }}>
              <button onClick={handleAddToCart}>ADD TO CART</button>
              <button
                onClick={() => toggleWishlist(product.id)}
                className='product-wishlist-btn'
                aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
              >
                {wished ? '♥ In Wishlist' : '♡ Add to Wishlist'}
              </button>
            </div>
            <VirtualTryOn
                productImage={product.image}
                productMaskImage={product.mask || inferMaskUrl(product.image)}
                productName={product.name}
                onAddToCart={() => handleAddToCart()}
                isLoggedIn={isLoggedIn}
            />
            <p className='productdisplay-right-category'><span>Category :</span>Women , T-Shirt, Crop Top</p>
            <p className='productdisplay-right-category'><span>Tags :</span>Modern, Latest</p>
        </div>
    </div>
  )
}
