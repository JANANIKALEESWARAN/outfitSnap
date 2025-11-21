import React,{createContext, useEffect, useState} from "react";
import all_product from '../Components/Assets/all_product'
export const ShopContext=createContext(null);

const getDefaultCart=()=>{
        let cart={};
       for(let index=0;index<300+1;index++){
            cart[index]=0;
       }
        return cart;
    }

const ShopContextProvider=(props)=>{

    const[all_product,setAll_Product]=useState([]);
    
    const [cartItems,setCartItems]=useState(getDefaultCart());

    useEffect(()=>{
        const inferMaskUrl = (url) => {
            if (!url) return undefined;
            const q = String(url).split('?')[0];
            const dot = q.lastIndexOf('.');
            if (dot === -1) return url + '_mask';
            return q.slice(0, dot) + '_mask' + q.slice(dot);
        };
        fetch('http://localhost:4000/allproducts')
        .then((response)=>response.json())
        .then((data)=>{
            try{
                const enriched = Array.isArray(data) ? data.map(p=> ({ ...p, mask: p.mask || inferMaskUrl(p.image) })) : data;
                setAll_Product(enriched);
            } catch {
                setAll_Product(data);
            }
        })

        if(localStorage.getItem('auth-token')){
            fetch('http://localhost:4000/getcart',{
                method:'POST',
                headers:{
                    Accept:'application/form-data',
                    'auth-token':`${localStorage.getItem('auth-token')}`,
                    'Content-Type':'application/json',
                },
                body:"",
            }).then((response)=>response.json())
            .then((data)=>setCartItems(data));
        }
    },[])
    
    const addToCart=(itemId)=>{
        setCartItems((prev)=>({...prev,[itemId]:prev[itemId]+1}))
        if(localStorage.getItem('auth-token')){
            fetch('http://localhost:4000/addtocart',{
                method:'POST',
                headers:{
                    Accept:'application/form-data',
                    'auth-token':`${localStorage.getItem('auth-token')}`,
                    'Content-Type':'application/json',
                },
                body:JSON.stringify({"itemId":itemId}),
            })
            .then((response)=>response.json())
            .then((data)=>console.log(data));
        }
    }



    const removeFromCart=(itemId)=>{
        setCartItems((prev)=>({...prev,[itemId]:prev[itemId]-1}))
        if(localStorage.getItem('auth-token')){
             fetch('http://localhost:4000/removefromcart',{
                method:'POST',
                headers:{
                    Accept:'application/form-data',
                    'auth-token':`${localStorage.getItem('auth-token')}`,
                    'Content-Type':'application/json',
                },
                body:JSON.stringify({"itemId":itemId}),
            })
            .then((response)=>response.json())
            .then((data)=>console.log(data));
        }
    }
    const getTotalCartAmount=()=>{
        let totalAmount=0;
        for(const item in cartItems)
        {
            if(cartItems[item]>0)
            {
                let itemInfo=all_product.find((product)=>product.id===Number(item));
                totalAmount+=itemInfo.new_price*cartItems[item];
            }
        }
        return totalAmount;
    }

    const getTotalCartItems=()=>{
        let totalItem=0;
        for(const item in cartItems)
        {
            if(cartItems[item]>0)
            {
                totalItem+=cartItems[item];
            }
        }
        return totalItem;
    }
    
    const contextValue={ getTotalCartItems,getTotalCartAmount,all_product,cartItems,addToCart,removeFromCart};
    
    return(
        <ShopContext.Provider value={contextValue}>
            {props.children}
        </ShopContext.Provider>
    )
}
export default ShopContextProvider;