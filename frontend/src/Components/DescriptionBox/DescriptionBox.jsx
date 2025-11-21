import React from 'react'
import './DescriptionBox.css'
export const DescriptionBox = () => {
  return (
    <div className='descriptionbox'>
        <div className='descriptionbox-navigator'>
            <div className='descriptionbox-nav-box'>Description</div>
            <div className='descriptionbox-nav-box fade'>Review (122)</div>
        </div>
        <div className='descriptionbox-description'>
            <p>An e-commerce website is an online platform that facilitates buying and selling of products or services over the internet.
                It serves as avirtual marketplace where business and individuals showcase their products,interact with customers, and conduct transactions
                without need of physical pressure.
            </p>
            <p>
                E-commerce websites typically display products or services as a detailed descriptions,images,prices and any available (e.g., sizes,colors).
            </p>
        </div>
    </div>
  )
}
