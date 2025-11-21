import React from 'react'
import { Hero } from '../Components/Hero/Hero';
import {Popular} from '../Components/Popular/Popular';
import { Offers } from '../Components/Offers/Offers';
import { NewCollections } from '../Components/NewCollections/NewCollections';
import { NewsLetter } from '../Components/NewsLetter/NewsLetter';
import { LoginChoice } from '../Components/LoginChoice/LoginChoice';
export const Shop = () => {
  const isUserLoggedIn =localStorage.getItem("auth-token"); 
  return (
    <div>
        <Hero/>
        <Popular/>
          {!isUserLoggedIn && <LoginChoice />}
        <Offers/>
        <NewCollections/>
        <NewsLetter/>
    </div>
  )
}
