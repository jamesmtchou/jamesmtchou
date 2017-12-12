import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import NnArt from './Nn-art/Nn-art'
import './index.css';

const Shell = () => (
    <MuiThemeProvider>
        <div id="index">
            <NnArt/>
            <App/>
        </div>
    </MuiThemeProvider>
);

ReactDOM.render(
    <Shell />,
    document.getElementById('root')
);
