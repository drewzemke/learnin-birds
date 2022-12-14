import {
  addVectors,
  applyMatrix,
  normalRandom,
  sampleWeightedList,
  sigmoid,
} from '../../utils/mathServices';

export default class GeneticNeuralNetwork {
  // The 'signature' is an array that specifies the number of neurons in each layer of the NN.
  //  - signature[0] is the size of the input layer
  //  - signature[signature.length-1] is the size of the output layer
  constructor(signature) {
    this._signature = signature;

    // Intentionally initializing fitness to null so I can tell when it's been set
    this._fitness = null;

    // Time to build some arrays babyyyyy
    // (Gonna fill them with zeros though.)
    this._weights = [];
    this._biases = [];
    for (let i = 0; i < signature.length - 1; i++) {
      // If the ith layer has n neurons and the (i+1)th layer has m neurons
      // then we should create an m-by-n matrix of weights and an n-by-1 matrix (column vector)
      // of bias
      const n = signature[i];
      const m = signature[i + 1];
      this._weights.push(Array(m).fill(Array(n).fill(0)));
      this._biases.push(Array(m).fill(0));
    }
  }

  get signature() {
    return this._signature;
  }

  get fitness() {
    return this._fitness;
  }

  set fitness(newFit) {
    this._fitness = newFit;
  }

  get weights() {
    return this._weights;
  }

  set weights(newWeights) {
    this._weights = newWeights;
  }

  get biases() {
    return this._biases;
  }

  set biases(newBiases) {
    this._biases = newBiases;
  }

  // Random initialization method (parameters: mean and stddev??)
  initRandom(mean, stddev) {
    // Throw random values into everything.
    const genRand = () => normalRandom(mean, stddev);

    this._weights = this._weights.map(rows =>
      rows.map(row => Array.from(row, () => genRand()))
    );
    this._biases = this._biases.map(biases =>
      Array.from(biases, () => genRand())
    );
  }

  // Forward compute!
  // Should probably include some error handling in here just in case sizes don't line up?
  compute(input) {
    // console.log('computing with NN');
    // console.log(this.toString());
    // console.log(`input: ${input}`);

    let vec = input;
    // Iterate through the layers
    for (let i = 0; i < this._signature.length - 1; i++) {
      // Matrix multiply
      vec = applyMatrix(this._weights[i], vec);
      // Add bias
      vec = addVectors(vec, this._biases[i]);
      // Apply sigmoid
      vec = vec.map(sigmoid);
      // Ready for the next iteration!
    }
    return vec;
  }

  // Static method to combine two neural nets with the same signature
  // to generate a single offspring. Builds a neural net where each
  // weight or bias comes from one of the parents (with equal probability).
  // Each new weight/bias is mutated with probability 'mutationRate,' in which case
  // it is shifted by a value sampled from a normal distribution
  //
  // Params:
  //  - two neural nets (duh)
  //  - mutation rate (probability)
  //  - mutation stddev (should probably be small relative to the overall variance of both parents)
  static reproduce(parent1, parent2, mutationRate, mutationStddev) {
    // This should equal the signature of the other parent. If it doesn't, we're in trouble...
    const signature = parent1.signature;

    // Create a new NN
    const theBaby = new GeneticNeuralNetwork(signature);

    // Temporary mutation randomness
    const genMutation = () => normalRandom(0, mutationStddev);

    // Iterate through and choose new weights and biases for the baby based on the parents
    const newWeights = theBaby.weights.map((matrix, matrixIndex) =>
      matrix.map((row, rowIndex) =>
        row.map((element, elIndex) => {
          // Randomly choose a parent to inhert this weight from
          const chosenParent = Math.random() < 0.5 ? parent1 : parent2;
          let newEl = chosenParent.weights[matrixIndex][rowIndex][elIndex];
          // Decide whether to mutate
          if (Math.random() < mutationRate) {
            newEl += genMutation();
          }
          return newEl;
        })
      )
    );
    theBaby.weights = newWeights;

    const newBiases = theBaby.biases.map((vector, vectorIndex) =>
      vector.map((el, elIndex) => {
        // Randomly choose a parent to inhert this bias from
        const chosenParent = Math.random() < 0.5 ? parent1 : parent2;
        let newEl = chosenParent.biases[vectorIndex][elIndex];
        // Decide whether to mutate
        if (Math.random() < mutationRate) {
          newEl += genMutation();
        }
        return newEl;
      })
    );
    theBaby.biases = newBiases;

    return theBaby;
  }

  static makeNewGeneration(
    neuralNets,
    {
      reproductionMethod = 'pairs',
      reproductionMutationRate = 0,
      reproductionMutationStdDev = 1,
      weightedMaxQuota = 1,
      childrenPerPair = 2,
    }
  ) {
    // First, sort by fitness.
    const sortedNNs = [...neuralNets].sort(
      (net1, net2) => net2.fitness - net1.fitness
    );

    const newNNs = [];

    // Here's one way to do this...
    // Take the top 50% and have them pair off and make 4 children each.
    // Or, more generally: each pair generates 'childrenPerPair' children
    if (reproductionMethod === 'pairs') {
      // We do input validation to ensure that childrenPerPair divides
      // the number of NNs and that the number of NNs is at least 2*cPP
      for (let i = 0; i < (2 * sortedNNs.length) / childrenPerPair; i += 2) {
        Array.from({ length: childrenPerPair }, () =>
          newNNs.push(
            GeneticNeuralNetwork.reproduce(
              sortedNNs[i],
              sortedNNs[i + 1],
              reproductionMutationRate,
              reproductionMutationStdDev
            )
          )
        );
      }
    }

    // Here's another way to do it...
    // Note -- this is no longer used in the game. It didn't produce good learning outcomes :P
    if (reproductionMethod === 'weighted') {
      // Create a list of weights to use to select at random.
      // Let's try squaring the weights to emphasize higher scores
      const lowestFitness = sortedNNs[sortedNNs.length - 1];
      const weights = sortedNNs.map(nn => nn.fitness - lowestFitness);
      const totalWeight = weights.reduce((a, b) => a + b, 0);
      const normalizedWeights = weights.map(w => w / totalWeight);
      // console.log(weights);

      // Use the weights to randomly select parents for babies
      while (newNNs.length < neuralNets.length) {
        const parent1 =
          neuralNets[sampleWeightedList(normalizedWeights, weightedMaxQuota)];
        const parent2 =
          neuralNets[sampleWeightedList(normalizedWeights, weightedMaxQuota)];
        newNNs.push(
          GeneticNeuralNetwork.reproduce(
            parent1,
            parent2,
            reproductionMutationRate,
            reproductionMutationStdDev
          )
        );
      }
    }

    return newNNs;
  }

  // Nicely display an NN.
  toString() {
    let str = '';
    str += `signature: [${this._signature}]\n`;
    str += 'weights:\n';
    this._weights.forEach(rows => {
      rows.forEach(row => {
        str += `[${row}]\n`;
      });
      str += '\n';
    });
    str += 'biases:\n';
    this._biases.forEach(col => {
      col.forEach(el => {
        str += `[${el}]\n`;
      });
      str += '\n';
    });
    return str;
  }
}
