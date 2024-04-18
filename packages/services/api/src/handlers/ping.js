export default {
  pong: (req, res) => {
    console.log('ping2', req);
    res.status(200).json({message: 'pong'});
  },
};
