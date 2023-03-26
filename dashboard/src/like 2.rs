#[derive(Debug, Clone)]
struct Counter {
    length: usize,
    count: usize,
}

impl Counter {
    fn new(length: usize, count: usize) -> Self {
        Counter {
            count: 0,
            length,
        }
    }
}

impl Iterator for Counter {
    type Item = usize;

    fn next(&mut self) -> Option<Self::Item> {
        self.count += 1;
        if self.count <= self.length {
            Some(self.count)
        } else { 
            None
        }
    }
}

impl Decramentor for Counter {
    type Item = usize;
    todo!("Decramentor for Counter");
    fn back(&mut self) -> Option<Self::Item> {
        self.count -= 1;
        if self.count >= self.length {
            Some(self.count)
        } else {
            None
        }
    }
}

// example implementation:
// let powers_of_2: Vec<usize> = Counter::new(8).map(|n| 2usize.pow(n as u32)).collect();
// assert_eq!(powers_of_2, vec![2, 4, 8, 16, 32, 64, 128, 256]);
