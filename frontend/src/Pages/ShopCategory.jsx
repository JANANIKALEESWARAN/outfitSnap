import React ,{useContext, useMemo, useState}from 'react'
import './CSS/ShopCategory.css'
import { ShopContext } from '../Context/ShopContext';
import dropdown_icon from '../Components/Assets/dropdown_icon.png'
import {Item} from '../Components/Item/Item'

export const ShopCategory = (props) => {
  const{all_product}=useContext(ShopContext);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('relevance');

  const filtered = useMemo(() => {
    const byCat = all_product.filter((item) => props.category === item.category);
    const bySearch = q.trim()
      ? byCat.filter((item) =>
          `${item.name} ${item.category}`.toLowerCase().includes(q.trim().toLowerCase())
        )
      : byCat;
    const sorted = [...bySearch];
    if (sort === 'price-asc') sorted.sort((a, b) => a.new_price - b.new_price);
    if (sort === 'price-desc') sorted.sort((a, b) => b.new_price - a.new_price);
    if (sort === 'name-asc') sorted.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === 'name-desc') sorted.sort((a, b) => b.name.localeCompare(a.name));
    return sorted;
  }, [all_product, props.category, q, sort]);
  return (
    <div className='shop-category'>
      <img className='shopcategory-banner' src={props.banner} alt=""/>
      <div className='shopcategory-indexSort'>
        <p>
          <span>Showing {filtered.length}</span> products
        </p>
        <div className='shopcategory-controls' style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <input
            type='text'
            placeholder='Search in category...'
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd' }}
          />
          <div className='shopcategory-sort' style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>Sort by</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)} style={{ padding: '6px 10px' }}>
              <option value='relevance'>Relevance</option>
              <option value='price-asc'>Price: Low to High</option>
              <option value='price-desc'>Price: High to Low</option>
              <option value='name-asc'>Name: A to Z</option>
              <option value='name-desc'>Name: Z to A</option>
            </select>
            <img src={dropdown_icon} alt=""/>
          </div>
        </div>
      </div>
      <div className='shopcategory-products'>
        {filtered.map((item,i)=> (
          <Item key={i} id={item.id} name={item.name} image={item.image} new_price={item.new_price} old_price={item.old_price} />
        ))}
      </div>
      <div className='shopcategory-loadmore'>
        Explore More
      </div>
    </div>
  )
}
export default ShopCategory
