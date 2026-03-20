	program average_energy
	
	integer :: i,j,niter1,eqm

	niter1=500
	eqm=250

	niter1=niter1/10
	eqm=eqm/10

	open(10,file='AVE_ENERGY',status='old')
	ave_en=0
	counter=0
	do i=1,niter1
	  read(10,100) dum_en
	  if(i.gt.eqm)then
	    counter=counter+1
	    ave_en=ave_en+dum_en
	  end if
	end do

	ave_en=ave_en/counter

	write(*,101) ave_en

100	format(1x,f18.15)
101	format(f18.8)

	end program average_energy	
