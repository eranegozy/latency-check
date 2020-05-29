import sys
import numpy as np
import wave
import subprocess
import matplotlib.pyplot as plt
from scipy.io.wavfile import read
from scipy.signal import correlate
from scipy.signal import convolve
from scipy.signal import fftconvolve


#must be 32 bit wav file
def xcor(file1, file2):
	"""
	file1: The original sound 
	file2: The distorted/delayed sound 
	"""
	original_data = read(file1)
	delayed_data = read(file2)

	if delayed_data[0] != 44100:
		print ('ERROR SR {}'.format(delayed_data[0]))
		return

	delayed = delayed_data[1]
	original = original_data[1][:len(delayed)]
	
	print (len(original))
	print (len(delayed))
	
	corr = correlate(delayed, original, "full")
	conv = convolve(delayed, np.flipud(original), "full")
	shift = len(delayed)
	lag = np.argmax(corr) - shift + 1

	print (lag)
	print (corr)
	print (len(corr))
	print (conv)
	print (len(conv))

	plt.xcorr(delayed, original, usevlines=True, maxlags=None, normed=True, lw=1.5)
	plt.grid(True)
	plt.axis([-shift//4,shift, -1, 1])
	# plt.axvline(np.argmax(corr)-shift+1, color='red')
	name1 = file1.split('/')[-1]
	name2 = file2.split('/')[-1]
	title = "{0} vs. {1}".format(name1, name2)
	plt.xlabel('samples')
	plt.text(lag, -0.58, 'argmax', horizontalalignment='center', color="red")
	plt.text(lag, -0.66, lag, horizontalalignment='center', color="red")
	plt.title(title)
	plt.show()
	
	return lag

# lag = xcor('./app/public/audio/chirp.wav', './app/public/audio/noise_mixed_chirp.wav')

# lag = xcor('./app/public/audio/chirp.wav', './app/public/audio/noise_mixed_distort.wav')

# print (lag)

if __name__ ==  "__main__":
	print (xcor(sys.argv[1], sys.argv[2]))