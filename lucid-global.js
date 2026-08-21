function exposeLucid() {
  if (window.lucid) {
    window.Lucid = window.lucid;
    console.log('Lucid exposed:', window.Lucid);
  } else {
    setTimeout(exposeLucid, 50);
  }
}
exposeLucid();
