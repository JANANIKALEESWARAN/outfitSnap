import React, { useContext } from 'react';
import { ShopContext } from '../../Context/ShopContext';
import { WishlistContext } from '../../Context/WishlistContext';
import { Item } from '../Item/Item';
import './Wishlist.css';

export const Wishlist = () => {
  const { all_product } = useContext(ShopContext);
  const { wishlist, toggleWishlist } = useContext(WishlistContext);

  const items = all_product.filter((p) => wishlist.includes(p.id));

  return (
    <div className="wishlist-page">
      <h2>Your Wishlist</h2>
      {items.length === 0 ? (
        <p>No items in wishlist yet.</p>
      ) : (
        <div className="wishlist-grid">
          {items.map((item) => (
            <div key={item.id} className="wishlist-card">
              <Item id={item.id} name={item.name} image={item.image} new_price={item.new_price} old_price={item.old_price} />
              <button className="wishlist-remove" onClick={() => toggleWishlist(item.id)}>Remove</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Wishlist;
