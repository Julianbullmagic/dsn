 don
import { useState } from 'react';
import { Button, Input, Tabs, message } from 'antd';

const { TabPane } = Tabs;

const AuthPage = () => {
    const [activeTab, setActiveTab] = useState('login');
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    
    // Unified form field states
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
    });

    const handleTabChange = (key) => {
        setActiveTab(key);
    };

    const handleInputChange = (e) => {
        const { id, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [id]: value
        }));
    };

    const handleLogin = () => {
        // In a real app, this would make an API call to authenticate the user
        if (!formData.email || !formData.password) {
            message.error('Please enter both email and password');
            return;
        }
        
        console.log('Login attempt with:', { email: formData.email, password: formData.password });
        // For demo purposes, we'll just set the user as logged in
        setIsLoggedIn(true);
        // Save to localStorage to persist login state
        localStorage.setItem('user', JSON.stringify({ id: 1, name: 'Demo User', email: formData.email }));
        localStorage.setItem('token', 'demo-token');
        message.success('Login successful!');
    };

    const handleRegister = () => {
        // In a real app, this would make an API call to register the user
        if (!formData.username || !formData.email || !formData.password) {
            message.error('Please fill in all required fields');
            return;
        }
        
        if (formData.password !== formData.confirmPassword) {
            message.error('Passwords do not match');
            return;
        }
        
        console.log('Register attempt with:', { 
            username: formData.username, 
            email: formData.email, 
            password: formData.password 
        });
        
        // For demo purposes, show success message
        message.success('Registration successful! You can now login.');
        // Switch to login tab after successful registration
        setActiveTab('login');
        // Clear form data
        setFormData({
            username: '',
            email: '',
            password: '',
            confirmPassword: ''
        });
    };
    
    const handleLogout = () => {
        setIsLoggedIn(false);
        setFormData({
            username: '',
            email: '',
            password: '',
            confirmPassword: ''
        });
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        message.info('You have been logged out');
    };

    return (
        <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto' }}>
            <h1 style={{ textAlign: 'center' }}>Democratic Social Network</h1>
            {!isLoggedIn && (
                <Tabs activeKey={activeTab} onChange={handleTabChange}>
                    <TabPane tab="Login" key="login">
                        <div style={{ margin: '20px', padding: '20px', borderRadius: '8px', border: '1px solid #ddd' }}>
                            <div style={{ marginBottom: '15px' }}>
                                <label htmlFor="email" style={{ display: 'block', marginBottom: '5px' }}>Email:</label>
                                <Input 
                                    id="email" 
                                    type="email"
                                    placeholder="Enter your email" 
                                    value={formData.email}
                                    onChange={handleInputChange}
                                />
                            </div>
                            <div style={{ marginBottom: '20px' }}>
                                <label htmlFor="password" style={{ display: 'block', marginBottom: '5px' }}>Password:</label>
                                <Input 
                                    id="password" 
                                    type="password"
                                    placeholder="Enter your password" 
                                    value={formData.password}
                                    onChange={handleInputChange}
                                />
                            </div>
                            <Button type="primary" onClick={handleLogin} style={{ width: '100%' }}>
                                Login
                            </Button>
                        </div>
                    </TabPane>
                    <TabPane tab="Register" key="register">
                        <div style={{ margin: '20px', padding: '20px', borderRadius: '8px', border: '1px solid #ddd' }}>
                            <div style={{ marginBottom: '15px' }}>
                                <label htmlFor="username" style={{ display: 'block', marginBottom: '5px' }}>Username:</label>
                                <Input 
                                    id="username" 
                                    placeholder="Choose a username" 
                                    value={formData.username}
                                    onChange={handleInputChange}
                                />
                            </div>
                            <div style={{ marginBottom: '15px' }}>
                                <label htmlFor="email" style={{ display: 'block', marginBottom: '5px' }}>Email:</label>
                                <Input 
                                    id="email" 
                                    type="email"
                                    placeholder="Enter your email" 
                                    value={formData.email}
                                    onChange={handleInputChange}
                                />
                            </div>
                            <div style={{ marginBottom: '15px' }}>
                                <label htmlFor="password" style={{ display: 'block', marginBottom: '5px' }}>Password:</label>
                                <Input 
                                    id="password" 
                                    type="password"
                                    placeholder="Create a password" 
                                    value={formData.password}
                                    onChange={handleInputChange}
                                />
                            </div>
                            <div style={{ marginBottom: '20px' }}>
                                <label htmlFor="confirmPassword" style={{ display: 'block', marginBottom: '5px' }}>Confirm Password:</label>
                                <Input 
                                    id="confirmPassword" 
                                    type="password"
                                    placeholder="Confirm your password" 
                                    value={formData.confirmPassword}
                                    onChange={handleInputChange}
                                />
                            </div>
                            <Button type="primary" onClick={handleRegister} style={{ width: '100%' }}>
                                Register
                            </Button>
                        </div>
                    </TabPane>
                </Tabs>
            )}
            {isLoggedIn && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h2>Welcome to the Chat</h2>
                        <Button onClick={handleLogout}>Logout</Button>
                    </div>
                    <div style={{ marginBottom: '10px', padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
                        <Button style={{ marginRight: '10px' }}>-</Button>
                        <span>General</span>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <Input placeholder="Type your message..." />
                        <Button type="primary">Send</Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AuthPage;
