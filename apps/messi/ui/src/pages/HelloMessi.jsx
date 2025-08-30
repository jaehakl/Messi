import React, { useState, useEffect } from 'react';
import UserTable from '../components/user/UserTable';
import UserRegister from '../components/user/UserRegister';
import ImageUpload from '../components/image/imageUpload';
import ImageList from '../components/image/imageList';
import './HelloMessi.css';

const HelloMessi = () => {    
  return (
    <div className="hello-messi-container">    
      <ImageUpload />
      <ImageList />
      <UserRegister />
      <UserTable />
    </div>
  );
};

export default HelloMessi;
