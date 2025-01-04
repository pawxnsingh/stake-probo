import {useState} from 'react'
import './App.css'
import getGoogleOauthUrl from './utils/getGoogleUrl'
import axios from "axios";

function App() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")

    return (
        <>
            <div>
                <input type="text" placeholder={"email"} onChange={(e) => {
                    setEmail(e.target.value)
                }}/>
                <input type="text" placeholder={"password"} onChange={(e) => {
                    setPassword(e.target.value)
                }}/>
            </div>

            <button onClick={async () => {
                const res = await axios.post("http://localhost:3000/api/auth/signin", {
                    email: email,
                    password: password
                }, {
                    withCredentials: true
                })
                console.log(res.data)
            }}>
                Signin
            </button>

            <h1>Vite + React</h1>

            <div className="card">
                <button>
                    <a href={getGoogleOauthUrl()}>
                        Login with google
                    </a>
                </button>
            </div>

            <button onClick={async () => {
                await axios.post("http://localhost:3000/api/auth/two-factor", {
                    enable: true
                }, {
                    withCredentials: true
                });
            }}>Submit
            </button>
        </>
    )
}

export default App
