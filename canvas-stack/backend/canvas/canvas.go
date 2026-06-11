package canvas

import (
	"fmt"
	"os"
	"sync"
)

type Canvas struct {
	data  []byte
	file  string
	sizeX int
	sizeY int
	mu    sync.RWMutex
}

func Load(file string, sizeX, sizeY int) (*Canvas, error) {
	data, err := os.ReadFile(file)
	if os.IsNotExist(err) {
		data = make([]byte, sizeX*sizeY)
	} else if err != nil {
		return nil, err
	}
	return &Canvas{data: data, file: file, sizeX: sizeX, sizeY: sizeY}, nil
}

func (c *Canvas) Size() (int, int) {
	return c.sizeX, c.sizeY
}

func (c *Canvas) Bytes() []byte {
	c.mu.RLock()
	defer c.mu.RUnlock()
	snap := make([]byte, len(c.data))
	copy(snap, c.data)
	return snap
}

func (c *Canvas) Set(index int, value byte) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	if index < 0 || index >= len(c.data) {
		return fmt.Errorf("index %d out of range [0, %d)", index, len(c.data))
	}
	c.data[index] = value
	return nil
}

func (c *Canvas) Save() error {
	c.mu.RLock()
	snap := make([]byte, len(c.data))
	copy(snap, c.data)
	c.mu.RUnlock()
	return os.WriteFile(c.file, snap, 0644)
}
