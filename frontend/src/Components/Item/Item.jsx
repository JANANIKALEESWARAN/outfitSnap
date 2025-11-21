import React, { useContext } from 'react'
import './Item.css'
import {Link} from 'react-router-dom'
import { WishlistContext } from '../../Context/WishlistContext'
export const Item = (props) => {
  const { isWishlisted, toggleWishlist } = useContext(WishlistContext);
  const wished = isWishlisted(props.id);
  return (
    <div className='item'>
        <Link to={`/product/${props.id}`}><img onClick={window.scrollTo(0,0)} src={props.image} alt="" /></Link>
        <p>{props.name}</p>
        <div className='item-prices'>
            <div className='item-price-new'>
                ${props.new_price}
            </div>
             <div className='item-price-old'>
                ${props.old_price}
                
            </div>
        </div>
        <button
          onClick={() => toggleWishlist(props.id)}
          className='item-wishlist-btn'
          aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
          style={{ marginTop: 8 }}
        >
          {wished ? '♥ In Wishlist' : '♡ Add to Wishlist'}
        </button>
    </div>
  )
}

