import { loginEditor } from '../actions';

export default async function AdminLogin({ searchParams }:{ searchParams:Promise<{error?:string}> }){
  const params=await searchParams;
  return <main className="admin-login"><form action={loginEditor} className="login-card"><div className="crest-ring large">HBIU</div><div className="eyebrow dark">Graduation Yearbook Studio</div><h1>Editor Access</h1><p>Authorized HBIU administration only.</p>{params.error&&<div className="error-box">The access key was not accepted.</div>}<input name="access_key" type="password" placeholder="Editor access key" required/><button className="gold-button">Open Yearbook Studio</button></form></main>;
}
