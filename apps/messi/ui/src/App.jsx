import React, { useState, useEffect } from 'react';
import { Container, Content, Sidebar, Button, Form, Input } from 'rsuite';
import { useLocation, matchPath, useNavigate, Routes, Route } from 'react-router-dom';
import { useUser } from './contexts/UserContext';
import AuthUserProfile from './components/user/AuthUserProfile';
import HelloMessi from './pages/HelloMessi';
//import './App.css';
import 'rsuite/dist/rsuite.min.css';

function App() {
  //const { user } = useUser();

  return (
    <>
      <Container className="app-container">
        <Sidebar>
          <AuthUserProfile />
        </Sidebar>
        <Content className="content-area">
          <Routes>
            <Route path="/" element={<HelloMessi />} />
          </Routes>
        </Content>
      </Container>
    </>
  );
}

export default App;





