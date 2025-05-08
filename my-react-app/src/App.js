// App.js
import React from 'react';
import Home from './Home';
import TreeHierarchyPage from './TreeHierarchyPage';
import { withAuthenticator } from '@aws-amplify/ui-react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { fetchRoles, uploadImage, getImageUrl } from './RoleUtils';

const App = ({ signOut }) => {
    const [roles, setRoles] = React.useState([]);

    React.useEffect(() => {
        // Fetch roles using the function from RoleUtils.js
        fetchRoles().then((roles) => {
            // Sort roles based on the "order" field
            roles.sort((a, b) => a.order - b.order);
            setRoles(roles);
        });
    }, []);

    return (
        <Router>
            <div className="App">
                <div className="Content">
                    <Routes>
                        <Route
                            path="/tree"
                            element={<TreeHierarchyPage roles={roles}/>}
                        ></Route>
                        <Route
                            path="/"
                            element={<Home signOut={signOut}/>}
                        ></Route>
                    </Routes>
                </div>
            </div>
        </Router>
    );
};

export default withAuthenticator(App);
