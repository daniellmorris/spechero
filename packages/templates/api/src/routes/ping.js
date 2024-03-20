export default {
  ping: (req, res) => {
    console.log('ping', req);
    res.status(200).json({message: 'pong'});
  },
};
