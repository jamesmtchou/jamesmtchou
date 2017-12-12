import React, {Component} from 'react';
import './App.css';

class App extends Component {
    render() {
        return (
            <div className="app">
                <h1>James Chou</h1>
                <p>
                    Hi, I am <strong><a href="https://www.facebook.com/james.chou.9406417" id="facebook-link" target="_blank">James Chou</a></strong>. I'm a <strong><a href="http://www.github.com/jamesmtchou" target="_blank"
                                                       id="github-link">Full Stack Software Engineer</a></strong>, and a <strong><a href="https://www.kaggle.com/jamesmtchou" target="_blank" id="kaggle-link">Data Scientist</a></strong> living in San
                    Francisco, CA.
                </p>
                <p>
                    I am working at <strong><a href="http://www.accenture.com" target="_blank" id="accenture-link">Accenture</a></strong> as a Technology Consultant. My current client is <strong><a href="https://www.autodesk.com" target="_blank" id="autodesk-link">Autodesk</a></strong>. I've also worked at <strong><a href="https://www.microsoft.com/" target="_blank"
                                                                 id="microsoft-link">Microsoft</a></strong> on internal IAM systems.
                </p>
                <p>
                    I primarily do JavaScript, CSS, HTML, Python, and Java here and there. I also produced <strong><a
                    href="https://www.youtube.com/watch?v=ejJ8AiGy2aI" target="_blank"
                    id="video-link">shows</a></strong> for the Taiwanese American community. Finally, I have an adorable poodle who sometimes posts his cute <strong><a href="http://instagram.com/poo_poo_littlered" target="_blank" id="instagram-link">selfies</a></strong>.
                </p>
                <ul id="networks">
                    <li className="resume-link">
                        <a href="" target="_blank">
                            <i className="icon-file-text"></i>
                            <span>Resume</span>
                        </a>
                    </li>
                    <li className="instagram-link">
                        <a href="http://instagram.com/poo_poo_littlered" target="_blank">
                            <i className="icon-instagram"></i>
                            <span>Instagram</span>
                        </a>
                    </li>
                    <li className="facebook-link">
                        <a href="https://www.facebook.com/james.chou.9406417" target="_blank">
                            <i className="icon-facebook-sign"></i>
                            <span>Facebook</span>
                        </a>
                    </li>
                    <li className="github-link">
                        <a href="http://www.github.com/jamesmtchou" target="_blank">
                            <i className="icon-github"></i>
                            <span>GitHub</span>
                        </a>
                    </li>
                    <li className="kaggle-link">
                        <a href="https://www.kaggle.com/jamesmtchou" target="_blank">
                            <i className="icon-kaggle"></i>
                            <span>Kaggle</span>
                        </a>
                    </li>
                    <li className="linkedin-link">
                        <a href="https://www.linkedin.com/in/james-meng-ta-chou-5827837b/" target="_blank">
                            <i className="icon-linkedin-sign"></i>
                            <span>LinkedIn</span>
                        </a>
                    </li>
                </ul>
            </div>
        );
    }
}

export default App;
